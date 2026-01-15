import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createCategory } from '@kanak/api';
import { CreateCategoryInput } from '@kanak/shared';

export const dynamic = 'force-dynamic';

// Category mappings: [title, type, priority, color, icon]
const categoryMappings: Array<
  [string, string, string | undefined, string, string]
> = [
  // Needs
  ['ACT', 'expense', 'needs', '#4CAF50', 'activity'],
  ['Cooking Gas', 'expense', 'needs', '#FF5722', 'flame'],
  ['Electricity', 'expense', 'needs', '#FFD700', 'zap'],
  ['Food', 'expense', 'needs', '#FF6B35', 'utensils'],
  ['Groceries', 'expense', 'needs', '#4CAF50', 'shopping-cart'],
  ['Hospital', 'expense', 'needs', '#E91E63', 'hospital'],
  ['Medicines', 'expense', 'needs', '#9C27B0', 'pill'],
  ['Milk', 'expense', 'needs', '#FFFFFF', 'milk'],
  ['Mobile', 'expense', 'needs', '#2196F3', 'smartphone'],
  ['Petrol', 'expense', 'needs', '#FF5252', 'fuel'],
  ['Rent', 'expense', 'needs', '#3D5AFE', 'home'],
  ['Toll', 'expense', 'needs', '#757575', 'road'],
  ['Transport', 'expense', 'needs', '#00BCD4', 'car'],
  ['TV', 'expense', 'needs', '#7C4DFF', 'tv'],
  ['Veg and Fruits', 'expense', 'needs', '#4CAF50', 'apple'],
  ['Maid', 'expense', 'needs', '#9E9E9E', 'user'],
  ['Maintenance', 'expense', 'needs', '#FF9800', 'wrench'],
  ['Haircuts', 'expense', 'needs', '#E91E63', 'scissors'],

  // Wants
  ['Entertainment', 'expense', 'wants', '#9C27B0', 'film'],
  ['Festival', 'expense', 'wants', '#FFD700', 'party-popper'],
  ['Gift', 'expense', 'wants', '#E91E63', 'gift'],
  ['Gym', 'expense', 'wants', '#FF5722', 'dumbbell'],
  ['Home Improvement', 'expense', 'wants', '#3D5AFE', 'hammer'],
  ['Shopping', 'expense', 'wants', '#FF4081', 'shopping-bag'],
  ['Tour', 'expense', 'wants', '#00BCD4', 'map'],
  ['Travel', 'expense', 'wants', '#2196F3', 'plane'],
  ['Misc', 'expense', 'wants', '#9E9E9E', 'more-horizontal'],

  // Savings
  ['Gold Chit', 'passive-savings', 'savings', '#FFD700', 'coins'],
  ['RD', 'passive-savings', 'savings', '#4CAF50', 'piggy-bank'],
  ['Savings', 'passive-savings', 'savings', '#00E5A0', 'wallet'],
  ['SIP', 'passive-savings', 'savings', '#2196F3', 'trending-up'],

  // Insurance
  ['Insurance', 'expense', 'insurance', '#3D5AFE', 'shield'],

  // Liabilities
  ['Debt', 'expense', 'liabilities', '#FF5252', 'credit-card'],
  ['Repayment', 'expense', 'liabilities', '#FF5722', 'arrow-left'],
  ['Lending', 'expense', 'liabilities', '#9C27B0', 'hand'],

  // Income
  ['Salary', 'income', undefined, '#4CAF50', 'dollar-sign'],
  ['Interest', 'income', undefined, '#00E5A0', 'percent'],

  // Intra-transfer
  ['Intratransfer', 'intra-transfer', undefined, '#757575', 'arrow-left-right'],

  // Others (no specific priority)
  ['Service', 'expense', undefined, '#9E9E9E', 'settings'],
  ['Tax', 'expense', undefined, '#FF5252', 'file-text'],
  ['Unknown', 'expense', undefined, '#616161', 'help-circle'],
  ['Varshith Expense', 'expense', undefined, '#FF6B35', 'user'],
  ['Vidhya Expense', 'expense', undefined, '#E91E63', 'user'],
  ['Vidhya Mom', 'expense', undefined, '#9C27B0', 'user'],
  ['Vignesh Expense', 'expense', undefined, '#2196F3', 'user'],
  ['OpenSpace', 'expense', undefined, '#00BCD4', 'square'],
];

export async function POST(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);
    const userId = authPayload.userId;

    const results: Array<{
      success: boolean;
      category: string;
      error?: string;
    }> = [];
    const errors: Array<{ category: string; error: string }> = [];

    for (const [title, type, priority, color, icon] of categoryMappings) {
      try {
        const categoryData: CreateCategoryInput = {
          title,
          type: type as any,
          priority: priority as any,
          color,
          icon,
        };

        const category = await createCategory(userId, categoryData);
        results.push({ success: true, category: category.title });
      } catch (error: any) {
        // Skip if category already exists (duplicate)
        if (error.code === 'P2002') {
          results.push({
            success: false,
            category: title,
            error: 'Already exists',
          });
        } else {
          errors.push({ category: title, error: error.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      created: results.filter((r: { success: boolean }) => r.success).length,
      skipped: results.filter((r: { success: boolean }) => !r.success).length,
      errors: errors.length > 0 ? errors : undefined,
      results,
    });
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Seed categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
