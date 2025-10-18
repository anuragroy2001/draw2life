import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createSession = mutation({
  args: {
    hostId: v.string(),
    hostNickname: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate 6-character alphanumeric code
    const sessionCode = generateSessionCode();
    
    const sessionId = await ctx.db.insert("gameSessions", {
      sessionCode,
      hostId: args.hostId,
      state: "waiting", // waiting, active, voting, completed
      currentRound: 0,
      currentPrompt: "",
      totalRounds: 0,
      maxRounds: 3,
      scoredRounds: [],
      players: [{
        userId: args.hostId,
        nickname: args.hostNickname,
        score: 0,
        roundWins: 0,
        isReady: false,
        isHost: true,
        joinedAt: Date.now(),
      }],
      createdAt: Date.now(),
      expiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
    });
    
    return { sessionId, sessionCode };
  },
});

export const joinSession = mutation({
  args: {
    sessionCode: v.string(),
    playerId: v.string(),
    nickname: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("gameSessions")
      .withIndex("by_sessionCode", (q) => q.eq("sessionCode", args.sessionCode))
      .first();
    
    if (!session) {
      throw new Error("Session not found");
    }
    
    if (session.state !== "waiting") {
      throw new Error("Session is no longer accepting new players");
    }
    
    if (session.expiresAt < Date.now()) {
      throw new Error("Session has expired");
    }
    
    // Check if player already exists
    const existingPlayer = session.players.find(p => p.userId === args.playerId);
    if (existingPlayer) {
      return session;
    }
    
    const newPlayer = {
      userId: args.playerId,
      nickname: args.nickname,
      score: 0,
      roundWins: 0,
      isReady: false,
      isHost: false,
      joinedAt: Date.now(),
    };
    
    await ctx.db.patch(session._id, {
      players: [...session.players, newPlayer],
    });
    
    return await ctx.db.get(session._id);
  },
});

export const startGame = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    
    if (session.players.length < 2) {
      throw new Error("Need at least 2 players to start");
    }
    
    // Generate first prompt randomly
    const prompts = [
      "A bird flying and catching on fire",
      "A car hitting the wall and exploding",
      "A kid jumping all the way to the moon",
      "A coke bottle exploding into many pieces",
      "A runner winning a race at the last second"
    ];
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    
    await ctx.db.patch(args.sessionId, {
      state: "active",
      currentRound: 1,
      currentPrompt: prompt,
    });
    
    return session;
  },
});

export const completeRound = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    roundWinnerId: v.string(), // Player ID who won this round
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    
    // Update the winner's round wins (points are already awarded by calculateRoundScores)
    const updatedPlayers = session.players.map(player =>
      player.userId === args.roundWinnerId
        ? { ...player, roundWins: (player.roundWins || 0) + 1 }
        : player
    );
    
    const totalRounds = (session.totalRounds || 0) + 1;
    const maxRounds = session.maxRounds || 3;
    
    // Check if we've completed all rounds
    if (totalRounds >= maxRounds) {
      await ctx.db.patch(args.sessionId, {
        players: updatedPlayers,
        totalRounds,
        state: "completed",
      });
    } else {
      // Move to next round
      await ctx.db.patch(args.sessionId, {
        players: updatedPlayers,
        totalRounds,
        state: "waiting", // Go back to waiting for next round
      });
    }
    
    return await ctx.db.get(args.sessionId);
  },
});

export const nextRound = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    
    // Generate new prompt randomly
    const prompts = [
      "A bird flying and catching on fire",
      "A car hitting the wall and exploding",
      "A kid jumping all the way to the moon",
      "A coke bottle exploding into many pieces",
      "A runner winning a race at the last second"
    ];
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    
    await ctx.db.patch(args.sessionId, {
      state: "active",
      currentRound: session.currentRound + 1,
      currentPrompt: prompt,
    });
    
    return session;
  },
});

export const endGame = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      state: "completed",
    });
    
    return await ctx.db.get(args.sessionId);
  },
});

export const getSession = query({
  args: { sessionCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameSessions")
      .withIndex("by_sessionCode", (q) => q.eq("sessionCode", args.sessionCode))
      .first();
  },
});

export const getSessionById = query({
  args: { sessionId: v.id("gameSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const subscribeToSession = query({
  args: { sessionCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameSessions")
      .withIndex("by_sessionCode", (q) => q.eq("sessionCode", args.sessionCode))
      .first();
  },
});

export const updatePlayerReady = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    playerId: v.string(),
    isReady: v.boolean(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    
    const updatedPlayers = session.players.map(player =>
      player.userId === args.playerId
        ? { ...player, isReady: args.isReady }
        : player
    );
    
    await ctx.db.patch(args.sessionId, {
      players: updatedPlayers,
    });
    
    return await ctx.db.get(args.sessionId);
  },
});

// Helper function to generate session code
function generateSessionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
