'use client';

import {
  Badge,
  Button,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Slider,
} from '@kanak/ui';
import { IconNumber123, IconX } from '@tabler/icons-react';
import { Table } from '@tanstack/react-table';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { NumberRangeFilter } from './data-table-types';

/**
 * Default filter function for number range filters
 * Checks if the number value falls within the selected range
 */
export const numberRangeFilterFn = (
  row: any,
  columnId: string,
  filterValue: [number, number] | undefined
) => {
  if (!filterValue || filterValue.length !== 2) {
    return true;
  }

  const cellValue = row.getValue(columnId);
  if (cellValue === null || cellValue === undefined) {
    return false;
  }

  const numValue = Number(cellValue);
  if (isNaN(numValue)) {
    return false;
  }

  const [min, max] = filterValue;
  return numValue >= min && numValue <= max;
};

interface DataTableFilterNumberRangeProps<TData> {
  columnId: string;
  table: Table<TData>;
}

export function DataTableFilterNumberRange<TData>({
  columnId,
  table,
}: DataTableFilterNumberRangeProps<TData>) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<[number, number] | undefined>(undefined);
  const [filterOptions, setFilterOptions] = useState<
    NumberRangeFilter | undefined
  >();

  useEffect(() => {
    const meta = table.getColumn(columnId)?.columnDef.meta as any;
    if (meta && meta.filter && meta.filter.type === 'NUMBER_RANGE') {
      const filter = meta.filter as NumberRangeFilter;
      setFilterOptions(filter);
      // Initialize value to min and max if not set
      setValue((prevValue) => {
        if (prevValue === undefined) {
          return [filter.min, filter.max];
        }
        return prevValue;
      });
    } else {
      setFilterOptions(undefined);
    }
  }, [table, columnId]);

  // Store the applied filter value separately from the local slider value
  const [appliedValue, setAppliedValue] = useState<
    [number, number] | undefined
  >(undefined);

  // Apply filter when appliedValue changes
  useEffect(() => {
    const column = table.getColumn(columnId);
    if (!column || !filterOptions) return;

    const isFiltered =
      appliedValue &&
      appliedValue.length === 2 &&
      (appliedValue[0] !== filterOptions.min ||
        appliedValue[1] !== filterOptions.max);

    if (isFiltered) {
      column.setFilterValue(appliedValue);
    } else {
      // Clear filter if value is at full range or undefined
      column.setFilterValue(undefined);
    }
  }, [appliedValue, columnId, table, filterOptions]);

  // Sync local state when table filter is cleared externally (e.g., via resetColumnFilters)
  // This effect only runs when columnFilters state changes (e.g., when resetColumnFilters is called)
  useEffect(() => {
    const column = table.getColumn(columnId);
    if (!column || !filterOptions) return;

    const tableFilterValue = column.getFilterValue() as
      | [number, number]
      | undefined;
    const tableHasFilter = tableFilterValue !== undefined;

    // Check if local value represents a filtered state (not at full range)
    const isLocallyFiltered =
      value &&
      value.length === 2 &&
      (value[0] !== filterOptions.min || value[1] !== filterOptions.max);

    // Only reset if:
    // 1. We have a filtered value locally
    // 2. Table has no filter (was cleared externally)
    // 3. The table filter value doesn't match our applied value (to avoid resetting during normal updates)
    const valuesMatch =
      tableFilterValue &&
      appliedValue &&
      tableFilterValue[0] === appliedValue[0] &&
      tableFilterValue[1] === appliedValue[1];

    if (isLocallyFiltered && !tableHasFilter && !valuesMatch) {
      setValue([filterOptions.min, filterOptions.max]);
      setAppliedValue(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.getState().columnFilters]);

  const hasRange = value !== undefined && value.length === 2;
  const min = filterOptions?.min ?? 0;
  const max = filterOptions?.max ?? 100;
  const step = filterOptions?.step ?? 1;
  const transform = filterOptions?.transform;

  // Helper function to format numbers using transform if available
  const formatValue = (num: number): string => {
    return transform ? transform(num) : num.toString();
  };

  // Check if there are unapplied changes
  // This is true if:
  // 1. We have a value set
  // 2. Either appliedValue is undefined (first time) OR the values don't match
  // 3. The value is not at full range
  const hasUnappliedChanges =
    value &&
    value.length === 2 &&
    (!appliedValue ||
      appliedValue.length !== 2 ||
      value[0] !== appliedValue[0] ||
      value[1] !== appliedValue[1]) &&
    (value[0] !== min || value[1] !== max);

  const isFiltered =
    appliedValue &&
    appliedValue.length === 2 &&
    filterOptions &&
    (appliedValue[0] !== filterOptions.min ||
      appliedValue[1] !== filterOptions.max);

  return (
    <>
      {filterOptions && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="border border-dashed rounded-md border-gray-300 h-[32px] flex items-center justify-center px-2 text-sm gap-2 hover:bg-gray-50 cursor-pointer  bg-white">
              <div className="flex items-center gap-1">
                <IconNumber123 className="text-muted-foreground !w-[16px]" />
                {filterOptions.text}
              </div>
              {hasRange &&
                appliedValue &&
                appliedValue[0] !== min &&
                appliedValue[1] !== max && (
                  <div className="py-1 flex items-center gap-2 h-[28px]">
                    <Separator orientation="vertical" className="" />
                    <Badge
                      variant={'secondary'}
                      className="bg-primary/10 text-primary"
                    >
                      {formatValue(appliedValue[0])} -{' '}
                      {formatValue(appliedValue[1])}
                    </Badge>
                  </div>
                )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[350px] p-0" align="start">
            <div className="p-3">
              <div className="flex w-full max-w-md flex-col gap-2">
                <div className="flex items-center justify-between mb-4">
                  <Label htmlFor="number-range-slider">
                    {filterOptions.text}
                  </Label>
                  {hasRange && (
                    <span className="text-muted-foreground text-sm flex items-center gap-1">
                      {formatValue(value[0])} - {formatValue(value[1])}
                    </span>
                  )}
                </div>
                <Slider
                  id="number-range-slider"
                  max={max}
                  min={min}
                  onValueChange={(newValue) => {
                    if (newValue.length === 2) {
                      setValue([newValue[0] ?? min, newValue[1] ?? max]);
                    }
                  }}
                  step={step}
                  value={value || [min, max]}
                />
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span>{formatValue(min)}</span>
                  <span>{formatValue(max)}</span>
                </div>
                {(hasUnappliedChanges || isFiltered) && (
                  <>
                    <Separator className="" />
                    <div className="w-full justify-end flex gap-2">
                      {isFiltered && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setValue([min, max]);
                            setAppliedValue([min, max]);
                            setOpen(false);
                          }}
                        >
                          <IconX className="mr-2 h-4 w-4" />
                          Clear filter
                        </Button>
                      )}
                      {hasUnappliedChanges && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            if (value && value.length === 2) {
                              setAppliedValue([value[0], value[1]]);
                            }
                          }}
                        >
                          Apply
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}
