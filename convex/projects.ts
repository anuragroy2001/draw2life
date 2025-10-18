import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const projectId = await ctx.db.insert("projects", {
      title: args.title,
      description: args.description,
      createdBy: args.createdBy,
      collaborators: [{
        userId: args.createdBy,
        role: "owner",
        lastSeen: Date.now(),
      }],
    });
    return projectId;
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx: QueryCtx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx: QueryCtx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.userId))
      .collect();
  },
});

export const addCollaborator = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx: MutationCtx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const updatedCollaborators = [
      ...project.collaborators,
      {
        userId: args.userId,
        role: args.role,
        lastSeen: Date.now(),
      },
    ];

    await ctx.db.patch(args.projectId, {
      collaborators: updatedCollaborators,
    });
  },
});

export const updateCursorPosition = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.string(),
    cursorPosition: v.object({
      x: v.number(),
      y: v.number(),
      tool: v.string(),
    }),
  },
  handler: async (ctx: MutationCtx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const updatedCollaborators = project.collaborators.map((collaborator) =>
      collaborator.userId === args.userId
        ? {
            ...collaborator,
            cursorPosition: args.cursorPosition,
            lastSeen: Date.now(),
          }
        : collaborator
    );

    await ctx.db.patch(args.projectId, {
      collaborators: updatedCollaborators,
    });
  },
});
