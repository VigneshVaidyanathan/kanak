import type { ReactNode } from 'react';

// Filter option type for combobox filters
export type FilterOption<T = string> = {
  label: string;
  value: T;
};

// Filter type constants
export const FilterTypes = {
  COMBOBOX: 'COMBOBOX',
  DATE_RANGE: 'DATE_RANGE',
  NUMBER_RANGE: 'NUMBER_RANGE',
} as const;

// Filter type union
export type FilterType = (typeof FilterTypes)[keyof typeof FilterTypes];

// Base filter configuration
export type BaseFilter = {
  text: string;
  placeholder: string;
};

// Combobox filter configuration
export type ComboboxFilter = BaseFilter & {
  type: typeof FilterTypes.COMBOBOX;
  options: FilterOption[];
};

// Range filter configuration (can be extended later)
export type DateRangeFilter = BaseFilter & {
  type: typeof FilterTypes.DATE_RANGE;
  // Add range-specific properties here when needed
};

// Number range filter configuration
export type NumberRangeFilter = BaseFilter & {
  type: typeof FilterTypes.NUMBER_RANGE;
  min: number;
  max: number;
  step?: number;
  transform?: (value: number) => string;
};

// Union type for all filter types
export type ColumnFilter = ComboboxFilter | DateRangeFilter | NumberRangeFilter;

// Type guard for combobox filter
export function isComboboxFilter(
  filter: ColumnFilter
): filter is ComboboxFilter {
  return filter.type === 'COMBOBOX';
}

// Type guard for range filter
export function isRangeFilter(filter: ColumnFilter): filter is DateRangeFilter {
  return filter.type === 'DATE_RANGE';
}

// Type guard for number range filter
export function isNumberRangeFilter(
  filter: ColumnFilter
): filter is NumberRangeFilter {
  return filter.type === 'NUMBER_RANGE';
}

// Table action type
export type TableAction<T> = {
  onClick: (row: T) => void;
  renderer: (row: T) => ReactNode;
  showSeparatorAfter?: boolean;
};

// Context menu actions configuration
export type ContextMenuActions<T> = {
  title: string;
  actions: TableAction<T>[] | ((row: T) => TableAction<T>[]);
};

// Server-side table parameters
export type ServerTableParams = {
  page: number;
  pageSize: number;
  sorting: Array<{ id: string; desc: boolean }>;
  globalFilter?: string;
  columnFilters: Array<{ id: string; value: unknown }>;
};

// Server-side table response
export type ServerTableResponse<TData> = {
  data: TData[];
  totalCount: number;
  totalPages: number;
};

// Server action function type for server-side pagination
// When serverSide is true, tableParams should be provided and function returns ServerTableResponse<TData>
// When serverSide is false, tableParams is undefined and function returns TData[]
export type ServerActionFunction<TArgs extends any[], TData> = (
  ...args: [...TArgs, ServerTableParams?]
) => Promise<ServerTableResponse<TData> | TData[]>;
