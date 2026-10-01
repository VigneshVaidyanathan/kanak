import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel.js';
import { MutationCtx, QueryCtx, mutation, query } from './_generated/server.js';
import { requireWorkspace } from './lib/auth.js';

// Matches the shape the rest of the app returns: `id`, not `_id`.
function toChat(chat: Doc<'ai_chats'>) {
  return {
    id: chat._id,
    title: chat.title,
    model: chat.model,
    lastMessageAt: chat.lastMessageAt,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
}

function toMessage(message: Doc<'ai_messages'>) {
  return {
    id: message._id,
    chatId: message.chatId,
    role: message.role as 'user' | 'assistant',
    parts: message.parts,
    createdAt: message.createdAt,
  };
}

/**
 * A chat in the active workspace, or null.
 *
 * A chat belonging to another workspace reads as absent rather than forbidden,
 * so a probe cannot tell a real id from a made-up one.
 */
async function ownedChat(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<'workspaces'>,
  id: Id<'ai_chats'>
) {
  const chat = await ctx.db.get(id);
  if (
    !chat ||
    chat.workspaceId !== workspaceId ||
    chat.deletedAt !== undefined
  ) {
    return null;
  }
  return chat;
}

export const getChatsByUserId = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const chats = await ctx.db
      .query('ai_chats')
      .withIndex('by_workspaceId_lastMessageAt', (q) =>
        q.eq('workspaceId', workspaceId)
      )
      .order('desc')
      .take(args.limit ?? 100);

    return chats.filter((c) => c.deletedAt === undefined).map(toChat);
  },
});

export const getMessagesByChatId = query({
  args: { chatId: v.id('ai_chats') },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const chat = await ownedChat(ctx, workspaceId, args.chatId);
    if (!chat) return [];

    const messages = await ctx.db
      .query('ai_messages')
      .withIndex('by_chatId_createdAt', (q) => q.eq('chatId', args.chatId))
      .collect();

    return messages.map(toMessage);
  },
});

export const createChat = mutation({
  args: { title: v.optional(v.string()), model: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId, workspaceId } = await requireWorkspace(ctx);
    const now = Date.now();

    return await ctx.db.insert('ai_chats', {
      userId,
      workspaceId,
      title: args.title ?? 'New chat',
      model: args.model,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Append turns to a chat. The browser calls this, not the chat HTTP action —
 * keeping every write out of the AI request path is what makes "the assistant
 * cannot modify your data" a fact about the code rather than a promise.
 */
export const appendMessages = mutation({
  args: {
    chatId: v.id('ai_chats'),
    messages: v.array(v.object({ role: v.string(), parts: v.any() })),
  },
  handler: async (ctx, args) => {
    const { userId, workspaceId } = await requireWorkspace(ctx);

    const chat = await ownedChat(ctx, workspaceId, args.chatId);
    if (!chat) throw new Error('Chat not found');

    const now = Date.now();
    // Messages inserted in the same millisecond would sort arbitrarily, so the
    // index key is nudged forward per message to keep the turn order stable.
    for (const [i, message] of args.messages.entries()) {
      await ctx.db.insert('ai_messages', {
        chatId: args.chatId,
        userId,
        workspaceId,
        role: message.role,
        parts: message.parts,
        createdAt: now + i,
      });
    }

    await ctx.db.patch(args.chatId, { lastMessageAt: now, updatedAt: now });
  },
});

export const renameChat = mutation({
  args: { id: v.id('ai_chats'), title: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const chat = await ownedChat(ctx, workspaceId, args.id);
    if (!chat) throw new Error('Chat not found');

    await ctx.db.patch(args.id, { title: args.title, updatedAt: Date.now() });
  },
});

export const deleteChat = mutation({
  args: { id: v.id('ai_chats') },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const chat = await ownedChat(ctx, workspaceId, args.id);
    if (!chat) throw new Error('Chat not found');

    // Soft delete: the messages stay, as wealth_sections does.
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
