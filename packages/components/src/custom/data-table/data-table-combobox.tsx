'use client';

import {
  Badge,
  Checkbox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
} from '@kanak/ui';
import { IconSelect, IconX } from '@tabler/icons-react';
import { Table } from '@tanstack/react-table';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { ComboboxFilter } from './data-table-types';

/**
 * Default filter function for combobox filters
 * Uses OR logic with exact value matching
 */
export const comboboxFilterFn = (
  row: any,
  columnId: string,
  filterValue: any
) => {
  // OR logic: return true if the row value exactly matches any selected filter value
  if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) {
    return true;
  }
  const cellValue = row.original[columnId];
  return filterValue.includes(cellValue);
};

interface DataTableComboboxProps<TData> {
  columnId: string;
  table: Table<TData>;
}

export function DataTableCombobox<TData>({
  columnId,
  table,
}: DataTableComboboxProps<TData>) {
  const [open, setOpen] = useState(false);
  const [selValues, setSelValues] = useState<string[]>([]);
  const [hasSelectionMade, setHasSelectionMade] = useState(false);
  const [filterOptions, setFilterOptions] = useState<
    ComboboxFilter | undefined
  >();

  useEffect(() => {
    const meta = table.getColumn(columnId)?.columnDef.meta as any;
    if (meta && meta.filter.text) {
      setFilterOptions(meta.filter as ComboboxFilter);
    } else {
      setFilterOptions(undefined);
    }
  }, [table, columnId]);

  // Debounce filter application
  useEffect(() => {
    const column = table.getColumn(columnId);
    if (!column) return;

    const timeoutId = setTimeout(() => {
      column.setFilterValue(selValues.length > 0 ? selValues : undefined);
    }, 1000); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [selValues, columnId, table]);

  // Track if this column has an active filter in the table state
  const columnFiltersState = table.getState().columnFilters;

  // Sync local state when table filter changes externally (e.g., via resetColumnFilters or URL params)
  useEffect(() => {
    const currentColumnFilter = columnFiltersState.find(
      (f) => f.id === columnId
    );
    if (currentColumnFilter && Array.isArray(currentColumnFilter.value)) {
      // Filter was set externally (e.g., from URL), sync local state
      const filterValues = currentColumnFilter.value as string[];
      // Only update if values are different to avoid unnecessary re-renders
      const currentValuesSorted = [...selValues].sort().join(',');
      const filterValuesSorted = [...filterValues].sort().join(',');
      if (currentValuesSorted !== filterValuesSorted) {
        setSelValues(filterValues);
        setHasSelectionMade(filterValues.length > 0);
      }
    } else if (!currentColumnFilter) {
      // Filter was cleared externally
      if (selValues.length > 0 || hasSelectionMade) {
        setSelValues([]);
        setHasSelectionMade(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnFiltersState, columnId]);

  return (
    <>
      {filterOptions && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="border border-dashed rounded-md border-gray-300 h-[32px] flex items-center justify-center px-2 text-sm gap-2 hover:bg-gray-50 cursor-pointer bg-white">
              <div className="flex items-center gap-1">
                <IconSelect className="text-muted-foreground !w-[16px]" />
                {filterOptions.text}
              </div>
              {selValues.length > 0 && (
                <div className="py-1 flex items-center gap-2 h-[28px]">
                  <Separator orientation="vertical" className="" />

                  {selValues.length < 3 &&
                    selValues.map((val, index) => {
                      const option = filterOptions.options.find(
                        (s) => s.value === val
                      );
                      if (!option) {
                        return <></>;
                      }

                      return (
                        <Badge
                          key={index}
                          variant={'secondary'}
                          className="bg-primary/10 text-primary"
                        >
                          {option.label}
                        </Badge>
                      );
                    })}

                  {selValues.length > 2 && (
                    <Badge
                      variant={'secondary'}
                      className="bg-primary/10 text-primary"
                    >
                      {selValues.length} selected
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder={filterOptions.placeholder}
                className="h-9"
              />
              <CommandList>
                <CommandEmpty>No data found.</CommandEmpty>
                <CommandGroup>
                  {filterOptions.options.map((option, i) => (
                    <CommandItem
                      key={i}
                      value={option.value}
                      onSelect={() => {
                        let newValues = selValues;
                        if (selValues.includes(option.value)) {
                          newValues = selValues.filter(
                            (s) => s !== option.value
                          );
                        } else {
                          newValues = [...selValues, option.value];
                        }

                        setSelValues(newValues);
                        setHasSelectionMade(newValues.length > 0);
                      }}
                    >
                      <Checkbox
                        checked={selValues.includes(option.value)}
                        className="text-white"
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {selValues.length > 0 && (
                  <>
                    <Separator className="" />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSelValues([]);
                          setHasSelectionMade(false);
                        }}
                      >
                        <IconX />
                        <div>Clear all filters</div>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}
