import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import { CreateCategoryInput, UpdateCategoryInput } from '@kanak/shared';
import { getConvexClient } from './db';

// Helper to convert Convex category to API format
function convertCategoryFromConvex(category: any): any {
  if (!category) return null;
  return {
    id: category._id,
    title: category.title,
    color: category.color,
    icon: category.icon,
    description: category.description,
    type: category.type,
    priority: category.priority,
    active: category.active,
    userId: category.userId,
    createdAt: new Date(category.createdAt),
    updatedAt: new Date(category.updatedAt),
  };
}

export async function getCategoriesByUserId(
  userId: string,
  activeOnly: boolean = true
): Promise<any[]> {
  const convex = await getConvexClient();
  const categories = await convex.query(api.categories.getCategoriesByUserId, {
    userId: userId as Id<'users'>,
    activeOnly,
  });
  return categories.map(convertCategoryFromConvex);
}

export async function getCategoryById(
  id: string,
  userId: string
): Promise<any> {
  const convex = await getConvexClient();
  const category = await convex.query(api.categories.getCategoryById, {
    id: id as Id<'categories'>,
    userId: userId as Id<'users'>,
  });
  return convertCategoryFromConvex(category);
}

export async function createCategory(
  userId: string,
  input: CreateCategoryInput
): Promise<any> {
  const convex = await getConvexClient();
  const category = await convex.mutation(api.categories.createCategory, {
    userId: userId as Id<'users'>,
    title: input.title,
    color: input.color,
    icon: input.icon,
    description: input.description,
    type: input.type,
    priority: input.priority,
    active: true,
  });
  return convertCategoryFromConvex(category);
}

export async function updateCategory(
  id: string,
  userId: string,
  input: UpdateCategoryInput
): Promise<any> {
  const convex = await getConvexClient();
  const category = await convex.mutation(api.categories.updateCategory, {
    id: id as Id<'categories'>,
    userId: userId as Id<'users'>,
    title: input.title,
    color: input.color,
    icon: input.icon,
    description: input.description,
    type: input.type,
    priority: input.priority,
  });
  return convertCategoryFromConvex(category);
}

export async function deactivateCategory(
  id: string,
  userId: string
): Promise<any> {
  const convex = await getConvexClient();
  const category = await convex.mutation(api.categories.deactivateCategory, {
    id: id as Id<'categories'>,
    userId: userId as Id<'users'>,
  } as { id: Id<'categories'>; userId: Id<'users'> });
  return convertCategoryFromConvex(category);
}
