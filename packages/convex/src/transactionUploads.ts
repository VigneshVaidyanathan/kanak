import { v } from 'convex/values';
import { mutation, query } from './_generated/server.js';

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const createTransactionUpload = mutation({
  args: {
    userId: v.id('users'),
    storageId: v.optional(v.id('_storage')),
    fileName: v.string(),
    fileSize: v.number(),
    totalRows: v.number(),
    uploadedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const uploadId = await ctx.db.insert('transaction_uploads', {
      userId: args.userId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      totalRows: args.totalRows,
      uploadedAt: args.uploadedAt,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(uploadId);
  },
});

export const getTransactionUploadsByUserId = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const uploads = await ctx.db
      .query('transaction_uploads')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    // Sort by uploadedAt descending
    return uploads.sort((a, b) => b.uploadedAt - a.uploadedAt);
  },
});
