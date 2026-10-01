import { v } from 'convex/values';
import { Doc } from './_generated/dataModel.js';
import { mutation, query } from './_generated/server.js';
import { requireUser, requireWorkspace } from './lib/auth.js';

// Matches the shape the deleted API layer used to map: `id`, not `_id`, and
// epoch-millisecond timestamps, since Convex cannot serialize a Date.
function toUpload(upload: Doc<'transaction_uploads'>) {
  return {
    id: upload._id,
    userId: upload.userId,
    storageId: upload.storageId,
    fileName: upload.fileName,
    fileSize: upload.fileSize,
    totalRows: upload.totalRows,
    uploadedAt: upload.uploadedAt,
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
  };
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // No workspace needed: this hands out a storage URL and touches no rows.
    // Still gated, because an unauthenticated caller must not be able to
    // obtain one and write to this deployment's storage.
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createTransactionUpload = mutation({
  args: {
    storageId: v.optional(v.id('_storage')),
    fileName: v.string(),
    fileSize: v.number(),
    totalRows: v.number(),
    uploadedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, workspaceId } = await requireWorkspace(ctx);
    const now = Date.now();

    const uploadId = await ctx.db.insert('transaction_uploads', {
      ...args,
      userId,
      workspaceId,
      createdAt: now,
      updatedAt: now,
    });

    return toUpload((await ctx.db.get(uploadId))!);
  },
});

export const getTransactionUploadsByUserId = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const uploads = await ctx.db
      .query('transaction_uploads')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .collect();

    return uploads.sort((a, b) => b.uploadedAt - a.uploadedAt).map(toUpload);
  },
});
