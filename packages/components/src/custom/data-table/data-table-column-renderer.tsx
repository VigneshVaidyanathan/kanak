import * as React from 'react';
import { Column, Row } from '@tanstack/react-table';
import dayjs from 'dayjs';

export function DataTableRenderDate<TData>({
  row,
  column,
  forceColId,
}: {
  row: Row<TData>;
  column: Column<TData, unknown>;
  forceColId?: string;
}) {
  const dateField = row.getValue(forceColId ?? column.id) as string;
  return (
    <>
      {dateField && (
        <div className="text-sm text-gray-500 flex flex-col">
          <div>{dayjs(dateField).format('MMM DD, YYYY')}</div>
          <div className="text-xs">{dayjs(dateField).format('hh:mm A')}</div>
        </div>
      )}
    </>
  );
}
