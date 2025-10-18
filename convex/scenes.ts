import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
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
    }),
  },
  handler: async (ctx: MutationCtx, args) => {
    const sceneId = await ctx.db.insert("scenes", {
      projectId: args.projectId,
      sceneData: args.sceneData,
      layers: args.layers,
      metadata: args.metadata,
    });
    return sceneId;
  },
});

export const get = query({
  args: { id: v.id("scenes") },
  handler: async (ctx: QueryCtx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx: QueryCtx, args) => {
    return await ctx.db
      .query("scenes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const update = mutation({
  args: {
    id: v.id("scenes"),
    sceneData: v.optional(v.object({
      width: v.number(),
      height: v.number(),
      backgroundColor: v.string(),
      objects: v.array(v.any()),
    })),
    layers: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      visible: v.boolean(),
      locked: v.boolean(),
      opacity: v.number(),
      objects: v.array(v.string()),
    }))),
    metadata: v.optional(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      tags: v.array(v.string()),
      animationSettings: v.optional(v.any()),
    })),
  },
  handler: async (ctx: MutationCtx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteScene = mutation({
  args: { id: v.id("scenes") },
  handler: async (ctx: MutationCtx, args) => {
    await ctx.db.delete(args.id);
  },
});
