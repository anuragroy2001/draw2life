import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const castVote = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    voterId: v.string(),
    submissionId: v.id("gameSubmissions"),
    round: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if voter already voted in this round
    const existingVote = await ctx.db
      .query("gameVotes")
      .withIndex("by_voter_round", (q) => 
        q.eq("voterId", args.voterId).eq("round", args.round)
      )
      .first();
    
    if (existingVote) {
      throw new Error("Player has already voted in this round");
    }
    
    // Check if voter is trying to vote for their own submission
    const submission = await ctx.db.get(args.submissionId);
    if (submission && submission.playerId === args.voterId) {
      throw new Error("Cannot vote for your own submission");
    }
    
    const voteId = await ctx.db.insert("gameVotes", {
      sessionId: args.sessionId,
      voterId: args.voterId,
      submissionId: args.submissionId,
      round: args.round,
      votedAt: Date.now(),
    });
    
    return voteId;
  },
});

export const getVoteResults = query({
  args: {
    sessionId: v.id("gameSessions"),
    round: v.number(),
  },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("gameVotes")
      .withIndex("by_session_round", (q) => 
        q.eq("sessionId", args.sessionId).eq("round", args.round)
      )
      .collect();
    
    // Count votes per submission
    const voteCounts: Record<string, number> = {};
    votes.forEach(vote => {
      voteCounts[vote.submissionId] = (voteCounts[vote.submissionId] || 0) + 1;
    });
    
    return voteCounts;
  },
});

export const calculateRoundScores = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    round: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;

    // Check if scores for this round have already been calculated
    const scoredRounds = session.scoredRounds || [];
    if (scoredRounds.includes(args.round)) {
      console.log(`Scores for round ${args.round} already calculated, skipping...`);
      return { alreadyCalculated: true };
    }

    const votes = await ctx.db
      .query("gameVotes")
      .withIndex("by_session_round", (q) => 
        q.eq("sessionId", args.sessionId).eq("round", args.round)
      )
      .collect();
    
    // Count votes per submission
    const voteCounts: Record<string, number> = {};
    votes.forEach(vote => {
      voteCounts[vote.submissionId] = (voteCounts[vote.submissionId] || 0) + 1;
    });
    
    // Sort by vote count
    const sortedSubmissions = Object.entries(voteCounts)
      .sort(([,a], [,b]) => b - a);
    
    // Award points: 1st = 3, 2nd = 2, 3rd = 1
    const pointsAwarded: Record<string, number> = {};
    sortedSubmissions.forEach(([submissionId, voteCount], index) => {
      if (index === 0) pointsAwarded[submissionId] = 3;
      else if (index === 1) pointsAwarded[submissionId] = 2;
      else if (index === 2) pointsAwarded[submissionId] = 1;
      else pointsAwarded[submissionId] = 0;
    });
    
    // Get all submissions for this round
    const submissions = await ctx.db
      .query("gameSubmissions")
      .withIndex("by_session_round", (q) => 
        q.eq("sessionId", args.sessionId).eq("round", args.round)
      )
      .collect();
    
    const updatedPlayers = session.players.map(player => {
      const playerSubmission = submissions.find(s => s.playerId === player.userId);
      if (playerSubmission) {
        const points = pointsAwarded[playerSubmission._id] || 0;
        return {
          ...player,
          score: player.score + points,
        };
      }
      return player;
    });
    
    // Mark this round as scored and update players
    await ctx.db.patch(args.sessionId, {
      players: updatedPlayers,
      scoredRounds: [...scoredRounds, args.round],
    });
    
    return {
      voteCounts,
      pointsAwarded,
      updatedPlayers,
    };
  },
});

export const getPlayerVote = query({
  args: {
    sessionId: v.id("gameSessions"),
    voterId: v.string(),
    round: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameVotes")
      .withIndex("by_voter_round", (q) => 
        q.eq("voterId", args.voterId).eq("round", args.round)
      )
      .first();
  },
});

export const getRoundLeaderboard = query({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];
    
    return session.players
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        ...player,
        rank: index + 1,
      }));
  },
});

export const getRoundWinner = query({
  args: {
    sessionId: v.id("gameSessions"),
    round: v.number(),
  },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("gameVotes")
      .withIndex("by_session_round", (q) => 
        q.eq("sessionId", args.sessionId).eq("round", args.round)
      )
      .collect();
    
    if (votes.length === 0) return null;
    
    // Count votes per submission
    const voteCounts: Record<string, number> = {};
    votes.forEach(vote => {
      voteCounts[vote.submissionId] = (voteCounts[vote.submissionId] || 0) + 1;
    });
    
    // Find submission with most votes
    let maxVotes = 0;
    let winningSubmissionId: string | null = null;
    Object.entries(voteCounts).forEach(([submissionId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        winningSubmissionId = submissionId;
      }
    });
    
    if (!winningSubmissionId) return null;
    
    // Get the winning submission to find the player
    const winningSubmission = await ctx.db.get(winningSubmissionId as Id<"gameSubmissions">);
    if (!winningSubmission) return null;
    
    return {
      playerId: winningSubmission.playerId,
      voteCount: maxVotes,
      submissionId: winningSubmissionId,
    };
  },
});
