import {
  CreateWealthSectionInput,
  UpdateWealthSectionInput,
  CreateWealthLineItemInput,
  UpdateWealthLineItemInput,
  CreateWealthEntriesInput,
} from '@kanak/shared';
import { getConvexClient } from './db';
import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';

// Helper to convert timestamp to Date
function timestampToDate(timestamp: number): Date {
  return new Date(timestamp);
}

// Helper to convert Date to timestamp
function dateToTimestamp(date: Date): number {
  return date.getTime();
}

// Helper to convert Convex wealth section to API format
function convertWealthSectionFromConvex(section: any): any {
  if (!section) return null;
  return {
    id: section._id,
    userId: section.userId,
    name: section.name,
    color: section.color,
    operation: section.operation,
    order: section.order,
    deletedAt: section.deletedAt ? timestampToDate(section.deletedAt) : null,
    createdAt: timestampToDate(section.createdAt),
    updatedAt: timestampToDate(section.updatedAt),
    lineItems: section.lineItems
      ? section.lineItems.map(convertWealthLineItemFromConvex)
      : [],
  };
}

// Helper to convert Convex wealth line item to API format
function convertWealthLineItemFromConvex(lineItem: any): any {
  if (!lineItem) return null;
  return {
    id: lineItem._id,
    sectionId: lineItem.sectionId,
    userId: lineItem.userId,
    name: lineItem.name,
    order: lineItem.order,
    deletedAt: lineItem.deletedAt ? timestampToDate(lineItem.deletedAt) : null,
    createdAt: timestampToDate(lineItem.createdAt),
    updatedAt: timestampToDate(lineItem.updatedAt),
  };
}

// Helper to convert Convex wealth entry to API format
function convertWealthEntryFromConvex(entry: any): any {
  if (!entry) return null;
  return {
    id: entry._id,
    lineItemId: entry.lineItemId,
    userId: entry.userId,
    date: timestampToDate(entry.date),
    amount: entry.amount,
    createdAt: timestampToDate(entry.createdAt),
    updatedAt: timestampToDate(entry.updatedAt),
    lineItem: entry.lineItem
      ? {
          ...convertWealthLineItemFromConvex(entry.lineItem),
          section: entry.lineItem.section
            ? convertWealthSectionFromConvex(entry.lineItem.section)
            : null,
        }
      : null,
  };
}

// Wealth Section Functions
export async function getWealthSectionsByUserId(
  userId: string
): Promise<any[]> {
  const convex = await getConvexClient();
  const sections = await convex.query(api.wealth.getWealthSectionsByUserId, {
    userId: userId as Id<'users'>,
  });
  return sections.map(convertWealthSectionFromConvex);
}

export async function createWealthSection(
  userId: string,
  input: CreateWealthSectionInput
): Promise<any> {
  const convex = await getConvexClient();
  const section = await convex.mutation(api.wealth.createWealthSection, {
    userId: userId as Id<'users'>,
    name: input.name,
    color: input.color,
    operation: input.operation,
    order: input.order,
  });
  return convertWealthSectionFromConvex(section);
}

export async function updateWealthSection(
  userId: string,
  id: string,
  input: UpdateWealthSectionInput
): Promise<any> {
  const convex = await getConvexClient();
  const section = await convex.mutation(api.wealth.updateWealthSection, {
    userId: userId as Id<'users'>,
    id: id as Id<'wealth_sections'>,
    name: input.name,
    color: input.color,
    operation: input.operation,
    order: input.order,
  });
  return convertWealthSectionFromConvex(section);
}

export async function softDeleteWealthSection(
  userId: string,
  id: string
): Promise<any> {
  const convex = await getConvexClient();
  const section = await convex.mutation(api.wealth.softDeleteWealthSection, {
    userId: userId as Id<'users'>,
    id: id as Id<'wealth_sections'>,
  });
  return convertWealthSectionFromConvex(section);
}

// Wealth Line Item Functions
export async function createWealthLineItem(
  userId: string,
  input: CreateWealthLineItemInput
): Promise<any> {
  const convex = await getConvexClient();
  const lineItem = await convex.mutation(api.wealth.createWealthLineItem, {
    userId: userId as Id<'users'>,
    sectionId: input.sectionId as Id<'wealth_sections'>,
    name: input.name,
    order: input.order,
  });
  return convertWealthLineItemFromConvex(lineItem);
}

export async function updateWealthLineItem(
  userId: string,
  id: string,
  input: UpdateWealthLineItemInput
): Promise<any> {
  const convex = await getConvexClient();
  const lineItem = await convex.mutation(api.wealth.updateWealthLineItem, {
    userId: userId as Id<'users'>,
    id: id as Id<'wealth_line_items'>,
    sectionId: input.sectionId
      ? (input.sectionId as Id<'wealth_sections'>)
      : undefined,
    name: input.name,
    order: input.order,
  });
  return convertWealthLineItemFromConvex(lineItem);
}

export async function softDeleteWealthLineItem(
  userId: string,
  id: string
): Promise<any> {
  const convex = await getConvexClient();
  const lineItem = await convex.mutation(api.wealth.softDeleteWealthLineItem, {
    userId: userId as Id<'users'>,
    id: id as Id<'wealth_line_items'>,
  });
  return convertWealthLineItemFromConvex(lineItem);
}

// Wealth Entry Functions
export async function getWealthEntriesByDate(
  userId: string,
  date: Date
): Promise<any[]> {
  const convex = await getConvexClient();
  const entries = await convex.query(api.wealth.getWealthEntriesByDate, {
    userId: userId as Id<'users'>,
    date: dateToTimestamp(date),
  });
  return entries.map(convertWealthEntryFromConvex).filter((e) => e !== null);
}

export async function getWealthEntriesByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  const convex = await getConvexClient();
  const entries = await convex.query(api.wealth.getWealthEntriesByDateRange, {
    userId: userId as Id<'users'>,
    startDate: dateToTimestamp(startDate),
    endDate: dateToTimestamp(endDate),
  });
  return entries.map(convertWealthEntryFromConvex).filter((e) => e !== null);
}

export async function createOrUpdateWealthEntries(
  userId: string,
  input: CreateWealthEntriesInput
): Promise<any[]> {
  const convex = await getConvexClient();
  const entries = await convex.mutation(
    api.wealth.createOrUpdateWealthEntries,
    {
      userId: userId as Id<'users'>,
      date: dateToTimestamp(input.date),
      entries: input.entries.map((e) => ({
        lineItemId: e.lineItemId as Id<'wealth_line_items'>,
        amount: e.amount,
      })),
    }
  );
  return entries.map(convertWealthEntryFromConvex);
}

// Reorder Functions
export async function updateWealthSectionsOrder(
  userId: string,
  updates: Array<{ id: string; order: number }>
): Promise<any[]> {
  const convex = await getConvexClient();
  const sections = await convex.mutation(api.wealth.updateWealthSectionsOrder, {
    userId: userId as Id<'users'>,
    updates: updates.map((u) => ({
      id: u.id as Id<'wealth_sections'>,
      order: u.order,
    })),
  });
  return sections.map(convertWealthSectionFromConvex);
}

export async function updateWealthLineItemsOrder(
  userId: string,
  updates: Array<{ id: string; order: number }>
): Promise<any[]> {
  const convex = await getConvexClient();
  const lineItems = await convex.mutation(
    api.wealth.updateWealthLineItemsOrder,
    {
      userId: userId as Id<'users'>,
      updates: updates.map((u) => ({
        id: u.id as Id<'wealth_line_items'>,
        order: u.order,
      })),
    }
  );
  return lineItems.map(convertWealthLineItemFromConvex);
}
