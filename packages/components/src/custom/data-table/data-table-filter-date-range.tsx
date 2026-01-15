'use client';

import {
  Badge,
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  type DateRange,
} from '@kanak/ui';
import { IconCalendar, IconX } from '@tabler/icons-react';
import { Table } from '@tanstack/react-table';
import { format } from 'date-fns';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { DateRangeFilter } from './data-table-types';

/**
 * Default filter function for date range filters
 * Checks if the date value falls within the selected range
 */
export const dateRangeFilterFn = (
  row: any,
  columnId: string,
  filterValue: DateRange | undefined
) => {
  if (!filterValue || !filterValue.from || !filterValue.to) {
    return true;
  }

  const cellValue = row.getValue(columnId);
  if (!cellValue) {
    return false;
  }

  // Convert cell value to Date
  const cellDate = new Date(cellValue);
  const fromDate = new Date(filterValue.from);
  const toDate = new Date(filterValue.to);

  // Set time to start of day for fromDate and end of day for toDate
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);
  cellDate.setHours(0, 0, 0, 0);

  // Check if cell date is within range
  return cellDate >= fromDate && cellDate <= toDate;
};

interface DataTableFilterDateRangeProps<TData> {
  columnId: string;
  table: Table<TData>;
}

export function DataTableFilterDateRange<TData>({
  columnId,
  table,
}: DataTableFilterDateRangeProps<TData>) {
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filterOptions, setFilterOptions] = useState<
    DateRangeFilter | undefined
  >();

  useEffect(() => {
    const meta = table.getColumn(columnId)?.columnDef.meta as any;
    if (meta && meta.filter && meta.filter.type === 'DATE_RANGE') {
      setFilterOptions(meta.filter as DateRangeFilter);
    } else {
      setFilterOptions(undefined);
    }
  }, [table, columnId]);

  // Debounce filter application
  useEffect(() => {
    const column = table.getColumn(columnId);
    if (!column) return;

    const timeoutId = setTimeout(() => {
      // Set filter value if date range is selected, otherwise clear it
      column.setFilterValue(
        dateRange?.from && dateRange?.to ? dateRange : undefined
      );
    }, 1000); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [dateRange, columnId, table]);

  // Track if this column has an active filter in the table state
  const columnFiltersState = table.getState().columnFilters;

  // Sync local state when table filter is cleared externally (e.g., via resetColumnFilters)
  useEffect(() => {
    if (columnFiltersState.length === 0 && dateRange?.from && dateRange?.to) {
      setDateRange(undefined);
    }
  }, [columnFiltersState]);

  const hasDateRange = dateRange?.from && dateRange?.to;

  return (
    <>
      {filterOptions && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="border border-dashed rounded-md border-gray-300 h-[32px] flex items-center justify-center px-2 text-sm gap-2 hover:bg-gray-50 cursor-pointer bg-white">
              <div className="flex items-center gap-1">
                <IconCalendar className="text-muted-foreground !w-[16px]" />
                {filterOptions.text}
              </div>
              {hasDateRange && (
                <div className="py-1 flex items-center gap-2 h-[28px]">
                  <Separator orientation="vertical" className="" />
                  <Badge
                    variant={'secondary'}
                    className="bg-primary/10 text-primary"
                  >
                    {format(dateRange.from!, 'MMM dd')} -{' '}
                    {format(dateRange.to!, 'MMM dd')}
                  </Badge>
                </div>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                captionLayout="dropdown"
                startMonth={new Date(1950, 0)}
                endMonth={new Date(2100, 0)}
              />
              {hasDateRange && (
                <>
                  <Separator className="my-3" />
                  <div className="w-full justify-end flex">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDateRange(undefined);
                      }}
                    >
                      <IconX className="mr-2 h-4 w-4" />
                      Clear filter
                    </Button>
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}
