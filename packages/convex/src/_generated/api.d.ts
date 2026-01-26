/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from '../auth.js';
import type * as bankAccounts from '../bankAccounts.js';
import type * as budgets from '../budgets.js';
import type * as categories from '../categories.js';
import type * as index from '../index.js';
import type * as transactionRules from '../transactionRules.js';
import type * as transactionUploads from '../transactionUploads.js';
import type * as transactions from '../transactions.js';
import type * as users from '../users.js';
import type * as wealth from '../wealth.js';

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from 'convex/server';

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  bankAccounts: typeof bankAccounts;
  budgets: typeof budgets;
  categories: typeof categories;
  index: typeof index;
  transactionRules: typeof transactionRules;
  transactionUploads: typeof transactionUploads;
  transactions: typeof transactions;
  users: typeof users;
  wealth: typeof wealth;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'public'>
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'internal'>
>;

export declare const components: {};
