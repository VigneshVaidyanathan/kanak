import * as React from 'react';
import {
  ColumnDef,
  ColumnFilter as TanStackColumnFilter,
  SortingState,
} from '@tanstack/react-table';
import {
  ColumnFilter,
  ServerTableParams,
  isComboboxFilter,
  isNumberRangeFilter,
  isRangeFilter,
} from './data-table-types';
import type { DateRange } from '@kanak/ui';

/**
 * Transforms TanStack Table column filters to server-side filter format
 */
export function transformFiltersToServerParams<TData>(
  columnFilters: TanStackColumnFilter[],
  columns: ColumnDef<TData>[]
): Array<{ id: string; value: unknown }> {
  return columnFilters
    .map((filter) => {
      const column = columns.find((col) => col.id === filter.id);
      const meta = column?.meta as { filter?: ColumnFilter };

      // Transform based on filter type
      if (meta?.filter) {
        if (isComboboxFilter(meta.filter)) {
          // Combobox filters: value is array of selected values
          // Ensure it's always an array
          const filterValue = filter.value;
          if (Array.isArray(filterValue)) {
            return {
              id: filter.id,
              value: filterValue,
            };
          }
          // If it's a single value, wrap it in an array
          return {
            id: filter.id,
            value: filterValue !== undefined ? [filterValue] : [],
          };
        } else if (isRangeFilter(meta.filter)) {
          // Date range filters: value is DateRange object with from/to
          const dateRange = filter.value as DateRange | undefined;
          if (dateRange?.from && dateRange?.to) {
            return {
              id: filter.id,
              value: {
                from: dateRange.from.toISOString(),
                to: dateRange.to.toISOString(),
              },
            };
          }
          // Return undefined value if range is incomplete
          return {
            id: filter.id,
            value: undefined,
          };
        } else if (isNumberRangeFilter(meta.filter)) {
          // Number range filters: value is tuple [min, max]
          const range = filter.value as [number, number] | undefined;
          if (range && Array.isArray(range) && range.length === 2) {
            return {
              id: filter.id,
              value: {
                min: range[0],
                max: range[1],
              },
            };
          }
          // Return undefined value if range is invalid
          return {
            id: filter.id,
            value: undefined,
          };
        }
      }

      // Default: pass value as-is
      return {
        id: filter.id,
        value: filter.value,
      };
    })
    .filter((filter) => {
      // Filter out filters with undefined values
      return filter.value !== undefined;
    });
}

/**
 * Transforms TanStack Table sorting state to server-side sorting format
 */
export function transformSortingToServerParams(
  sorting: SortingState
): Array<{ id: string; desc: boolean }> {
  return sorting.map((sort) => ({
    id: sort.id,
    desc: sort.desc ?? false,
  }));
}

/**
 * Creates server-side table parameters from TanStack Table state
 */
export function createServerTableParams<TData>(params: {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  globalFilter?: string;
  columnFilters: TanStackColumnFilter[];
  columns: ColumnDef<TData>[];
}): ServerTableParams {
  return {
    page: params.pageIndex,
    pageSize: params.pageSize,
    sorting: transformSortingToServerParams(params.sorting),
    globalFilter: params.globalFilter || undefined,
    columnFilters: transformFiltersToServerParams(
      params.columnFilters,
      params.columns
    ),
  };
}
