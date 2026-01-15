'use client';

import * as React from 'react';
import { IconX } from '@tabler/icons-react';
import { Table } from '@tanstack/react-table';
import { DataTableCombobox } from './data-table-combobox';
import { DataTableFilterDateRange } from './data-table-filter-date-range';
import { DataTableFilterNumberRange } from './data-table-filter-number-range';
import {
  ColumnFilter,
  isComboboxFilter,
  isNumberRangeFilter,
  isRangeFilter,
} from './data-table-types';

interface DataTableFiltersProps<TData> {
  table: Table<TData>;
}

export function DataTableFilters<TData>({
  table,
}: DataTableFiltersProps<TData>) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {table
        .getAllColumns()
        .filter((c) => {
          const meta = c.columnDef.meta as { filter?: ColumnFilter };
          return meta?.filter && isComboboxFilter(meta.filter);
        })
        .map((c, i) => {
          return <DataTableCombobox key={i} columnId={c.id} table={table} />;
        })}

      {table
        .getAllColumns()
        .filter((c) => {
          const meta = c.columnDef.meta as { filter?: ColumnFilter };
          return meta?.filter && isRangeFilter(meta.filter);
        })
        .map((c, i) => {
          return (
            <DataTableFilterDateRange key={i} columnId={c.id} table={table} />
          );
        })}

      {table
        .getAllColumns()
        .filter((c) => {
          const meta = c.columnDef.meta as { filter?: ColumnFilter };
          return meta?.filter && isNumberRangeFilter(meta.filter);
        })
        .map((c, i) => {
          return (
            <DataTableFilterNumberRange key={i} columnId={c.id} table={table} />
          );
        })}

      {table.getState().columnFilters.length > 0 && (
        <div
          className="border border-dashed rounded-md border-gray-300 h-[32px] flex items-center justify-center px-2 text-sm gap-2 hover:bg-gray-50 cursor-pointer"
          onClick={() => {
            table.resetColumnFilters();
          }}
        >
          <div className="flex items-center gap-1">
            <IconX className="text-muted-foreground !w-[16px]" />
            Clear all filters
          </div>
        </div>
      )}
    </div>
  );
}
