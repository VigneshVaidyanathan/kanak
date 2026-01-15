'use client';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@kanak/ui';
import { IconCheck } from '@tabler/icons-react';
import { Table } from '@tanstack/react-table';
import { SlidersHorizontal } from 'lucide-react';
import * as React from 'react';
import { useMemo } from 'react';

interface DataTableColumnTogglerProps<TData> {
  table: Table<TData>;
}

export function DataTableColumnToggler<TData>({
  table,
}: DataTableColumnTogglerProps<TData>) {
  const columns = useMemo(() => {
    return table
      .getAllColumns()
      .filter((c) => c.getCanHide())
      .map((column) => {
        return {
          id: column.id,
          label:
            ((column.columnDef.meta as any)?.header as string) || column.id,
        };
      });
  }, [table]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="" size={'sm'}>
          <SlidersHorizontal />
          <div>View</div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuGroup>
          {columns.map((col, index) => {
            return (
              <DropdownMenuItem
                key={index}
                onClick={() => {
                  table.getColumn(col.id)?.toggleVisibility();
                }}
              >
                <div className="w-[20px]">
                  {table
                    .getAllColumns()
                    .filter((c) => c.getIsVisible() && c.getCanHide())
                    .map((c) => c.id)
                    .includes(col.id) && <IconCheck />}
                </div>
                <div>{col.label}</div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
