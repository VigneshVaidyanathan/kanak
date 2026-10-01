import { v } from 'convex/values';
import { Doc } from './_generated/dataModel.js';
import { mutation, query } from './_generated/server.js';
import { requireWorkspace } from './lib/auth.js';

// Matches the shape the deleted API layer used to map: `id`, not `_id`, and
// epoch-millisecond timestamps, since Convex cannot serialize a Date.
function toSection(section: Doc<'wealth_sections'>) {
  return {
    id: section._id,
    userId: section.userId,
    name: section.name,
    color: section.color,
    operation: section.operation,
    order: section.order,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  };
}

function toLineItem(lineItem: Doc<'wealth_line_items'>) {
  return {
    id: lineItem._id,
    userId: lineItem.userId,
    sectionId: lineItem.sectionId,
    name: lineItem.name,
    order: lineItem.order,
    createdAt: lineItem.createdAt,
    updatedAt: lineItem.updatedAt,
  };
}

function toEntry(entry: Doc<'wealth_entries'>) {
  return {
    id: entry._id,
    userId: entry.userId,
    lineItemId: entry.lineItemId,
    date: entry.date,
    amount: entry.amount,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

// Wealth Section Functions
export const getWealthSectionsByUserId = query({
  args: {},
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    const sections = await ctx.db
      .query('wealth_sections')
      .withIndex('by_workspaceId_deletedAt', (q) =>
        q.eq('workspaceId', workspaceId).eq('deletedAt', undefined)
      )
      .collect();

    // Get line items for each section
    const sectionsWithLineItems = await Promise.all(
      sections.map(async (section) => {
        const lineItems = await ctx.db
          .query('wealth_line_items')
          .withIndex('by_sectionId', (q) => q.eq('sectionId', section._id))
          .collect();

        const activeLineItems = lineItems
          .filter((li) => li.deletedAt === undefined)
          .sort((a, b) => a.order - b.order);

        return {
          ...toSection(section),
          lineItems: activeLineItems.map(toLineItem),
        };
      })
    );

    // Sort by order ascending
    return sectionsWithLineItems.sort((a, b) => a.order - b.order);
  },
});

export const createWealthSection = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
    operation: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, workspaceId } = await requireWorkspace(ctx);
    // If no order specified, get the max order and add 1
    let order = args.order;
    if (order === undefined) {
      const sections = await ctx.db
        .query('wealth_sections')
        .withIndex('by_workspaceId_deletedAt', (q) =>
          q.eq('workspaceId', workspaceId).eq('deletedAt', undefined)
        )
        .collect();

      const maxOrder = sections.reduce((max, s) => Math.max(max, s.order), -1);
      order = maxOrder + 1;
    }

    const now = Date.now();
    const sectionId = await ctx.db.insert('wealth_sections', {
      userId,
      workspaceId,
      name: args.name,
      color: args.color || '#9E9E9E',
      operation: args.operation || 'add',
      order,
      createdAt: now,
      updatedAt: now,
    });

    return toSection((await ctx.db.get(sectionId))!);
  },
});

export const updateWealthSection = mutation({
  args: {
    id: v.id('wealth_sections'),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    operation: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    const { id, ...updates } = args;

    // Verify the row is in this workspace
    const existing = await ctx.db.get(id);
    if (
      !existing ||
      existing.workspaceId !== workspaceId ||
      existing.deletedAt
    ) {
      throw new Error('Wealth section not found');
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return toSection((await ctx.db.get(id))!);
  },
});

export const softDeleteWealthSection = mutation({
  args: {
    id: v.id('wealth_sections'),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    // Verify the row is in this workspace
    const existing = await ctx.db.get(args.id);
    if (
      !existing ||
      existing.workspaceId !== workspaceId ||
      existing.deletedAt
    ) {
      throw new Error('Wealth section not found');
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return toSection((await ctx.db.get(args.id))!);
  },
});

// Wealth Line Item Functions
export const createWealthLineItem = mutation({
  args: {
    sectionId: v.id('wealth_sections'),
    name: v.string(),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, workspaceId } = await requireWorkspace(ctx);
    // Verify the section is in this workspace
    const section = await ctx.db.get(args.sectionId);
    if (!section || section.workspaceId !== workspaceId || section.deletedAt) {
      throw new Error('Wealth section not found');
    }

    // If no order specified, get the max order for this section and add 1
    let order = args.order;
    if (order === undefined) {
      const lineItems = await ctx.db
        .query('wealth_line_items')
        .withIndex('by_sectionId', (q) => q.eq('sectionId', args.sectionId))
        .collect();

      const activeLineItems = lineItems.filter(
        (li) => li.deletedAt === undefined
      );
      const maxOrder = activeLineItems.reduce(
        (max, li) => Math.max(max, li.order),
        -1
      );
      order = maxOrder + 1;
    }

    const now = Date.now();
    const lineItemId = await ctx.db.insert('wealth_line_items', {
      userId,
      workspaceId,
      sectionId: args.sectionId,
      name: args.name,
      order,
      createdAt: now,
      updatedAt: now,
    });

    return toLineItem((await ctx.db.get(lineItemId))!);
  },
});

export const updateWealthLineItem = mutation({
  args: {
    id: v.id('wealth_line_items'),
    sectionId: v.optional(v.id('wealth_sections')),
    name: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    const { id, ...updates } = args;

    // Verify the row is in this workspace
    const existing = await ctx.db.get(id);
    if (
      !existing ||
      existing.workspaceId !== workspaceId ||
      existing.deletedAt
    ) {
      throw new Error('Wealth line item not found');
    }

    // If sectionId is being updated, verify the new section is in this workspace
    if (updates.sectionId) {
      const section = await ctx.db.get(updates.sectionId);
      if (
        !section ||
        section.workspaceId !== workspaceId ||
        section.deletedAt
      ) {
        throw new Error('Wealth section not found');
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return toLineItem((await ctx.db.get(id))!);
  },
});

export const softDeleteWealthLineItem = mutation({
  args: {
    id: v.id('wealth_line_items'),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    // Verify the row is in this workspace
    const existing = await ctx.db.get(args.id);
    if (
      !existing ||
      existing.workspaceId !== workspaceId ||
      existing.deletedAt
    ) {
      throw new Error('Wealth line item not found');
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return toLineItem((await ctx.db.get(args.id))!);
  },
});

// Wealth Entry Functions
export const getWealthEntriesByDate = query({
  args: {
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    // Set time to start and end of day for comparison
    const startOfDay = new Date(args.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(args.date);
    endOfDay.setHours(23, 59, 59, 999);

    return await ctx.db
      .query('wealth_entries')
      .withIndex('by_workspaceId_date', (q) =>
        q
          .eq('workspaceId', workspaceId)
          .gte('date', startOfDay.getTime())
          .lte('date', endOfDay.getTime())
      )
      .collect()
      .then((entries) => entries.map(toEntry));
  },
});

export const getWealthEntriesByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    // Index range only: callers render the grid from sections + lineItemId,
    // so entries are not hydrated with their line item / section.
    const entries = await ctx.db
      .query('wealth_entries')
      .withIndex('by_workspaceId_date', (q) =>
        q
          .eq('workspaceId', workspaceId)
          .gte('date', args.startDate)
          .lte('date', args.endDate)
      )
      .collect();

    return entries.sort((a, b) => a.date - b.date).map(toEntry);
  },
});

export const createOrUpdateWealthEntries = mutation({
  args: {
    date: v.number(),
    entries: v.array(
      v.object({
        lineItemId: v.id('wealth_line_items'),
        amount: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userId, workspaceId } = await requireWorkspace(ctx);
    // Use date timestamp as-is (API sends UTC midnight; no timezone conversion)
    const entryTimestamp = args.date;

    // Verify all line items belong to this workspace
    const lineItemIds = args.entries.map((e) => e.lineItemId);
    const lineItems = await Promise.all(
      lineItemIds.map((id) => ctx.db.get(id))
    );

    const invalidLineItems = lineItems.filter(
      (li) => !li || li.workspaceId !== workspaceId || li.deletedAt
    );

    if (invalidLineItems.length > 0) {
      throw new Error(
        'One or more line items not found or do not belong to user'
      );
    }

    // Upsert each entry
    const results = await Promise.all(
      args.entries.map(async (entry) => {
        // Check if entry exists
        const existing = await ctx.db
          .query('wealth_entries')
          .withIndex('by_workspaceId_lineItemId_date_unique', (q) =>
            q
              .eq('workspaceId', workspaceId)
              .eq('lineItemId', entry.lineItemId)
              .eq('date', entryTimestamp)
          )
          .first();

        const now = Date.now();

        if (existing) {
          await ctx.db.patch(existing._id, {
            amount: entry.amount,
            updatedAt: now,
          });
          return toEntry((await ctx.db.get(existing._id))!);
        } else {
          const entryId = await ctx.db.insert('wealth_entries', {
            userId,
            workspaceId,
            lineItemId: entry.lineItemId,
            date: entryTimestamp,
            amount: entry.amount,
            createdAt: now,
            updatedAt: now,
          });
          return toEntry((await ctx.db.get(entryId))!);
        }
      })
    );

    return results;
  },
});

/** Update all entries for a given date to a new date (re-date). Uses UTC timestamps. */
export const updateWealthEntriesDate = mutation({
  args: {
    oldDateTimestamp: v.number(),
    newDateTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    const entries = await ctx.db
      .query('wealth_entries')
      .withIndex('by_workspaceId_date', (q) =>
        q.eq('workspaceId', workspaceId).eq('date', args.oldDateTimestamp)
      )
      .collect();

    const now = Date.now();
    for (const entry of entries) {
      await ctx.db.patch(entry._id, {
        date: args.newDateTimestamp,
        updatedAt: now,
      });
    }
    return entries.length;
  },
});

// Reorder Functions
export const updateWealthSectionsOrder = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id('wealth_sections'),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    // Verify all sections belong to this workspace
    const sectionIds = args.updates.map((u) => u.id);
    const userSections = await Promise.all(
      sectionIds.map((id) => ctx.db.get(id))
    );

    const invalidSections = userSections.filter(
      (s) => !s || s.workspaceId !== workspaceId || s.deletedAt
    );

    if (invalidSections.length > 0) {
      throw new Error(
        'Some wealth sections not found or do not belong to user'
      );
    }

    // Update each section's order
    await Promise.all(
      args.updates.map((update) =>
        ctx.db.patch(update.id, {
          order: update.order,
          updatedAt: Date.now(),
        })
      )
    );

    // Return updated sections with line items
    const sections = await ctx.db
      .query('wealth_sections')
      .withIndex('by_workspaceId_deletedAt', (q) =>
        q.eq('workspaceId', workspaceId).eq('deletedAt', undefined)
      )
      .collect();

    const sectionsWithLineItems = await Promise.all(
      sections.map(async (section) => {
        const lineItems = await ctx.db
          .query('wealth_line_items')
          .withIndex('by_sectionId', (q) => q.eq('sectionId', section._id))
          .collect();

        const activeLineItems = lineItems
          .filter((li) => li.deletedAt === undefined)
          .sort((a, b) => a.order - b.order);

        return {
          ...toSection(section),
          lineItems: activeLineItems.map(toLineItem),
        };
      })
    );

    return sectionsWithLineItems.sort((a, b) => a.order - b.order);
  },
});

export const updateWealthLineItemsOrder = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id('wealth_line_items'),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    // Verify all line items belong to this workspace
    const lineItemIds = args.updates.map((u) => u.id);
    const userLineItems = await Promise.all(
      lineItemIds.map((id) => ctx.db.get(id))
    );

    const invalidLineItems = userLineItems.filter(
      (li) => !li || li.workspaceId !== workspaceId || li.deletedAt
    );

    if (invalidLineItems.length > 0) {
      throw new Error(
        'Some wealth line items not found or do not belong to user'
      );
    }

    // Update each line item's order
    await Promise.all(
      args.updates.map((update) =>
        ctx.db.patch(update.id, {
          order: update.order,
          updatedAt: Date.now(),
        })
      )
    );

    // Return updated line items
    const lineItems = await ctx.db
      .query('wealth_line_items')
      .withIndex('by_workspaceId_deletedAt', (q) =>
        q.eq('workspaceId', workspaceId).eq('deletedAt', undefined)
      )
      .collect();

    return lineItems.sort((a, b) => a.order - b.order).map(toLineItem);
  },
});
