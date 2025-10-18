import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(),
    collaborators: v.array(v.object({
      userId: v.string(),
      role: v.union(v.literal("owner"), v.literal("editor"), v.literal("viewer")),
      lastSeen: v.number(),
      cursorPosition: v.optional(v.object({
        x: v.number(),
        y: v.number(),
        tool: v.string(),
      })),
    })),
  }).index("by_createdBy", ["createdBy"]),

  scenes: defineTable({
    projectId: v.id("projects"),
    sceneData: v.object({
      width: v.number(),
      height: v.number(),
      backgroundColor: v.string(),
      objects: v.array(v.any()),
    }),
    layers: v.array(v.object({
      id: v.string(),
      name: v.string(),
      visible: v.boolean(),
      locked: v.boolean(),
      opacity: v.number(),
      objects: v.array(v.string()),
    })),
    metadata: v.object({
      title: v.string(),
      description: v.optional(v.string()),
      tags: v.array(v.string()),
      animationSettings: v.optional(v.any()),
    }),
  }).index("by_project", ["projectId"]),

  // Game-related tables
  gameSessions: defineTable({
    sessionCode: v.string(),
    hostId: v.string(),
    state: v.union(
      v.literal("waiting"),
      v.literal("active"), 
      v.literal("voting"),
      v.literal("completed")
    ),
    currentRound: v.number(),
    currentPrompt: v.string(),
    players: v.array(v.object({
      userId: v.string(),
      nickname: v.string(),
      score: v.number(),
      roundWins: v.optional(v.number()), // Number of rounds won
      isReady: v.boolean(),
      isHost: v.boolean(),
      joinedAt: v.number(),
    })),
    totalRounds: v.optional(v.number()), // Total rounds to play (default 3)
    maxRounds: v.optional(v.number()), // Maximum rounds (3)
    scoredRounds: v.optional(v.array(v.number())), // Rounds that have had scores calculated
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_sessionCode", ["sessionCode"]),

  gameSubmissions: defineTable({
    sessionId: v.id("gameSessions"),
    playerId: v.string(),
    round: v.number(),
    firstSceneData: v.string(),
    secondSceneData: v.string(),
    firstSceneAnalysis: v.optional(v.string()), // AI analysis of first scene
    secondSceneAnalysis: v.optional(v.string()), // AI analysis of second scene
    videoUrl: v.optional(v.string()), // Generated animation video
    videoStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    )),
    submittedAt: v.number(),
    isComplete: v.boolean(),
  }).index("by_session_round", ["sessionId", "round"]),

  gameVotes: defineTable({
    sessionId: v.id("gameSessions"),
    voterId: v.string(),
    submissionId: v.id("gameSubmissions"),
    round: v.number(),
    votedAt: v.number(),
  }).index("by_session_round", ["sessionId", "round"])
    .index("by_voter_round", ["voterId", "round"]),
});
