import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submitScenes = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    playerId: v.string(),
    round: v.number(),
    firstSceneData: v.string(),
    secondSceneData: v.string(),
    firstSceneAnalysis: v.optional(v.string()),
    secondSceneAnalysis: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const submissionId = await ctx.db.insert("gameSubmissions", {
      sessionId: args.sessionId,
      playerId: args.playerId,
      round: args.round,
      firstSceneData: args.firstSceneData,
      secondSceneData: args.secondSceneData,
      firstSceneAnalysis: args.firstSceneAnalysis,
      secondSceneAnalysis: args.secondSceneAnalysis,
      videoStatus: "pending",
      submittedAt: Date.now(),
      isComplete: true,
    });
    
    return submissionId;
  },
});

export const updateSubmissionVideo = mutation({
  args: {
    submissionId: v.id("gameSubmissions"),
    videoUrl: v.string(),
    videoStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.submissionId, {
      videoUrl: args.videoUrl,
      videoStatus: args.videoStatus,
    });
  },
});

export const getSessionSubmissions = query({
  args: {
    sessionId: v.id("gameSessions"),
    round: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameSubmissions")
      .withIndex("by_session_round", (q) => 
        q.eq("sessionId", args.sessionId).eq("round", args.round)
      )
      .collect();
  },
});

export const getPlayerSubmission = query({
  args: {
    sessionId: v.id("gameSessions"),
    playerId: v.string(),
    round: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameSubmissions")
      .withIndex("by_session_round", (q) => 
        q.eq("sessionId", args.sessionId).eq("round", args.round)
      )
      .filter((q) => q.eq(q.field("playerId"), args.playerId))
      .first();
  },
});

export const markSubmissionComplete = mutation({
  args: { submissionId: v.id("gameSubmissions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.submissionId, {
      isComplete: true,
    });
  },
});

export const getSubmission = query({
  args: { submissionId: v.id("gameSubmissions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.submissionId);
  },
});
