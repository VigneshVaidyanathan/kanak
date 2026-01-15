import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Wealth Section Functions
export const getWealthSectionsByUserId = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const sections = await ctx.db
      .query('wealth_sections')
      .withIndex('by_userId_deletedAt', (q) =>
        q.eq('userId', args.userId).eq('deletedAt', undefined)
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
          ...section,
          lineItems: activeLineItems,
        };
      })
    );

    // Sort by order ascending
    return sectionsWithLineItems.sort((a, b) => a.order - b.order);
  },
});

export const createWealthSection = mutation({
  args: {
    userId: v.id('users'),
    name: v.string(),
    color: v.optional(v.string()),
    operation: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // If no order specified, get the max order and add 1
    let order = args.order;
    if (order === undefined) {
      const sections = await ctx.db
        .query('wealth_sections')
        .withIndex('by_userId_deletedAt', (q) =>
          q.eq('userId', args.userId).eq('deletedAt', undefined)
        )
        .collect();

      const maxOrder = sections.reduce((max, s) => Math.max(max, s.order), -1);
      order = maxOrder + 1;
    }

    const now = Date.now();
    const sectionId = await ctx.db.insert('wealth_sections', {
      userId: args.userId,
      name: args.name,
      color: args.color || '#9E9E9E',
      operation: args.operation || 'add',
      order,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(sectionId);
  },
});

export const updateWealthSection = mutation({
  args: {
    userId: v.id('users'),
    id: v.id('wealth_sections'),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    operation: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, userId, ...updates } = args;

    // Verify ownership
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw new Error('Wealth section not found');
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const softDeleteWealthSection = mutation({
  args: {
    userId: v.id('users'),
    id: v.id('wealth_sections'),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId || existing.deletedAt) {
      throw new Error('Wealth section not found');
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Wealth Line Item Functions
export const createWealthLineItem = mutation({
  args: {
    userId: v.id('users'),
    sectionId: v.id('wealth_sections'),
    name: v.string(),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify section ownership
    const section = await ctx.db.get(args.sectionId);
    if (!section || section.userId !== args.userId || section.deletedAt) {
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
      userId: args.userId,
      sectionId: args.sectionId,
      name: args.name,
      order,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(lineItemId);
  },
});

export const updateWealthLineItem = mutation({
  args: {
    userId: v.id('users'),
    id: v.id('wealth_line_items'),
    sectionId: v.optional(v.id('wealth_sections')),
    name: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, userId, ...updates } = args;

    // Verify ownership
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw new Error('Wealth line item not found');
    }

    // If sectionId is being updated, verify the new section belongs to the user
    if (updates.sectionId) {
      const section = await ctx.db.get(updates.sectionId);
      if (!section || section.userId !== userId || section.deletedAt) {
        throw new Error('Wealth section not found');
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const softDeleteWealthLineItem = mutation({
  args: {
    userId: v.id('users'),
    id: v.id('wealth_line_items'),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId || existing.deletedAt) {
      throw new Error('Wealth line item not found');
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Wealth Entry Functions
export const getWealthEntriesByDate = query({
  args: {
    userId: v.id('users'),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    // Set time to start and end of day for comparison
    const startOfDay = new Date(args.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(args.date);
    endOfDay.setHours(23, 59, 59, 999);

    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();

    const entries = await ctx.db
      .query('wealth_entries')
      .withIndex('by_userId_date', (q) => q.eq('userId', args.userId))
      .collect();

    const filteredEntries = entries.filter(
      (e) => e.date >= startTimestamp && e.date <= endTimestamp
    );

    // Get line items and sections for each entry
    const entriesWithRelations = await Promise.all(
      filteredEntries.map(async (entry) => {
        const lineItem = await ctx.db.get(entry.lineItemId);
        if (!lineItem) return null;

        const section = await ctx.db.get(lineItem.sectionId);
        if (!section) return null;

        return {
          ...entry,
          lineItem: {
            ...lineItem,
            section,
          },
        };
      })
    );

    return entriesWithRelations.filter((e) => e !== null);
  },
});

export const getWealthEntriesByDateRange = query({
  args: {
    userId: v.id('users'),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query('wealth_entries')
      .withIndex('by_userId_date', (q) => q.eq('userId', args.userId))
      .collect();

    const filteredEntries = entries.filter(
      (e) => e.date >= args.startDate && e.date <= args.endDate
    );

    // Get line items and sections for each entry
    const entriesWithRelations = await Promise.all(
      filteredEntries.map(async (entry) => {
        const lineItem = await ctx.db.get(entry.lineItemId);
        if (!lineItem) return null;

        const section = await ctx.db.get(lineItem.sectionId);
        if (!section) return null;

        return {
          ...entry,
          lineItem: {
            ...lineItem,
            section,
          },
        };
      })
    );

    // Sort by date ascending
    return entriesWithRelations
      .filter((e) => e !== null)
      .sort((a, b) => a.date - b.date);
  },
});

export const createOrUpdateWealthEntries = mutation({
  args: {
    userId: v.id('users'),
    date: v.number(),
    entries: v.array(
      v.object({
        lineItemId: v.id('wealth_line_items'),
        amount: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Set time to start of day for consistency
    const entryDate = new Date(args.date);
    entryDate.setHours(0, 0, 0, 0);
    const entryTimestamp = entryDate.getTime();

    // Verify all line items belong to the user
    const lineItemIds = args.entries.map((e) => e.lineItemId);
    const lineItems = await Promise.all(
      lineItemIds.map((id) => ctx.db.get(id))
    );

    const invalidLineItems = lineItems.filter(
      (li) => !li || li.userId !== args.userId || li.deletedAt
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
          .withIndex('by_userId_lineItemId_date_unique', (q) =>
            q
              .eq('userId', args.userId)
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
          return await ctx.db.get(existing._id);
        } else {
          const entryId = await ctx.db.insert('wealth_entries', {
            userId: args.userId,
            lineItemId: entry.lineItemId,
            date: entryTimestamp,
            amount: entry.amount,
            createdAt: now,
            updatedAt: now,
          });
          return await ctx.db.get(entryId);
        }
      })
    );

    return results;
  },
});

// Reorder Functions
export const updateWealthSectionsOrder = mutation({
  args: {
    userId: v.id('users'),
    updates: v.array(
      v.object({
        id: v.id('wealth_sections'),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Verify all sections belong to the user
    const sectionIds = args.updates.map((u) => u.id);
    const userSections = await Promise.all(
      sectionIds.map((id) => ctx.db.get(id))
    );

    const invalidSections = userSections.filter(
      (s) => !s || s.userId !== args.userId || s.deletedAt
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
      .withIndex('by_userId_deletedAt', (q) =>
        q.eq('userId', args.userId).eq('deletedAt', undefined)
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
          ...section,
          lineItems: activeLineItems,
        };
      })
    );

    return sectionsWithLineItems.sort((a, b) => a.order - b.order);
  },
});

export const updateWealthLineItemsOrder = mutation({
  args: {
    userId: v.id('users'),
    updates: v.array(
      v.object({
        id: v.id('wealth_line_items'),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Verify all line items belong to the user
    const lineItemIds = args.updates.map((u) => u.id);
    const userLineItems = await Promise.all(
      lineItemIds.map((id) => ctx.db.get(id))
    );

    const invalidLineItems = userLineItems.filter(
      (li) => !li || li.userId !== args.userId || li.deletedAt
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
      .withIndex('by_userId_deletedAt', (q) =>
        q.eq('userId', args.userId).eq('deletedAt', undefined)
      )
      .collect();

    return lineItems.sort((a, b) => a.order - b.order);
  },
});
