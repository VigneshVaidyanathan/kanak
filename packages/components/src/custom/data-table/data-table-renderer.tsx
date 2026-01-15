'use client';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@kanak/ui';
import { flexRender, Table as TableType } from '@tanstack/react-table';
import * as React from 'react';
import { ContextMenuActions } from './data-table-types';

interface DataTableColumnTogglerProps<TData> {
  table: TableType<TData>;
  emptyState?: React.ReactNode;
  contextMenuActions?: ContextMenuActions<TData>;
  footerRow?: (rows: TData[]) => React.ReactNode;
  onRowDoubleClick?: (row: TData) => void;
}

export function DataTableRenderer<TData>({
  table,
  emptyState,
  contextMenuActions,
  footerRow,
  onRowDoubleClick,
}: DataTableColumnTogglerProps<TData>) {
  return (
    <div className="w-full overflow-x-auto rounded-md border mb-3">
      {/* Table container using flex column */}
      <div className="flex flex-col">
        {/* Table Header */}
        <div className="border-b bg-muted/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} className="flex w-full">
              {headerGroup.headers.map((header) => {
                const hasFlexSize = (header.column.columnDef.meta as any)?.flex;
                const maxSize = (header.column.columnDef.meta as any)?.maxSize;
                const headerClassname = (header.column.columnDef.meta as any)
                  ?.headerClassname;
                const shouldWrap = (header.column.columnDef.meta as any)?.wrap;
                const columnSize = header.getSize();
                const minSize = header.column.columnDef.minSize;

                return (
                  <div
                    key={header.id}
                    className={`flex p-1 text-sm text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${
                      hasFlexSize ? 'flex-1' : ''
                    } ${shouldWrap ? 'items-start' : 'items-center'} ${
                      headerClassname || ''
                    }`}
                    style={{
                      ...(!hasFlexSize
                        ? {
                            width: `${columnSize}px`,
                            minWidth: `${minSize || columnSize}px`,
                            flexShrink: 0,
                          }
                        : {}),
                      ...(maxSize ? { maxWidth: `${maxSize}px` } : {}),
                      ...(shouldWrap
                        ? {
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'normal',
                          }
                        : {}),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {/* Table Body */}
        <div className="flex flex-col">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const rowData = row.original as TData;
              const rowContent = (
                <div
                  key={row.id}
                  className="flex w-full border-b transition-colors hover:bg-accent/50 data-[state=selected]:bg-muted cursor-pointer"
                  data-state={row.getIsSelected() && 'selected'}
                  onDoubleClick={() => onRowDoubleClick?.(rowData)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const hasFlexSize = (cell.column.columnDef.meta as any)
                      ?.flex;
                    const maxSize = (cell.column.columnDef.meta as any)
                      ?.maxSize;
                    const cellClassname = (cell.column.columnDef.meta as any)
                      ?.cellClassname;
                    const shouldWrap = (cell.column.columnDef.meta as any)
                      ?.wrap;
                    const columnSize = cell.column.getSize();
                    const minSize = cell.column.columnDef.minSize;

                    return (
                      <div
                        key={cell.id}
                        className={`flex p-2 align-middle [&:has([role=checkbox])]:pr-0 ${
                          hasFlexSize ? 'flex-1' : ''
                        } ${shouldWrap ? 'items-start' : 'items-center'} ${
                          cellClassname || ''
                        }`}
                        style={{
                          ...(!hasFlexSize
                            ? {
                                width: `${columnSize}px`,
                                minWidth: `${minSize || columnSize}px`,
                                flexShrink: 0,
                              }
                            : {}),
                          ...(maxSize ? { maxWidth: `${maxSize}px` } : {}),
                          ...(shouldWrap
                            ? {
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word',
                                whiteSpace: 'normal',
                              }
                            : {}),
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </div>
                    );
                  })}
                </div>
              );

              if (contextMenuActions) {
                const actions =
                  typeof contextMenuActions.actions === 'function'
                    ? contextMenuActions.actions(rowData)
                    : contextMenuActions.actions;

                return (
                  <ContextMenu key={row.id}>
                    <ContextMenuTrigger asChild>
                      {rowContent}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      {contextMenuActions.title && (
                        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                          {contextMenuActions.title}
                        </div>
                      )}
                      {actions.map((action, index) => (
                        <div key={index}>
                          <ContextMenuItem
                            onClick={() => action.onClick(rowData)}
                          >
                            {action.renderer(rowData)}
                          </ContextMenuItem>
                          {action.showSeparatorAfter && (
                            <ContextMenuSeparator />
                          )}
                        </div>
                      ))}
                    </ContextMenuContent>
                  </ContextMenu>
                );
              }

              return rowContent;
            })
          ) : (
            <div className="flex w-full">
              <div className="h-24 w-full flex items-center justify-center text-center">
                {emptyState || 'No results.'}
              </div>
            </div>
          )}
        </div>
        {/* Footer Row */}
        {footerRow &&
          (() => {
            const filteredRows = table
              .getFilteredRowModel()
              .rows.map((row) => row.original);
            if (filteredRows.length === 0) return null;
            const footerContent = footerRow(filteredRows);
            if (footerContent) {
              return (
                <div className="border-t bg-muted/30 font-semibold">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <div key={headerGroup.id} className="flex w-full">
                      {headerGroup.headers.map((header) => {
                        const hasFlexSize = (
                          header.column.columnDef.meta as any
                        )?.flex;
                        const maxSize = (header.column.columnDef.meta as any)
                          ?.maxSize;
                        const headerClassname = (
                          header.column.columnDef.meta as any
                        )?.headerClassname;
                        const shouldWrap = (header.column.columnDef.meta as any)
                          ?.wrap;
                        const columnId = header.column.id;
                        const isAmountColumn = columnId === 'amount';
                        const columnSize = header.getSize();
                        const minSize = header.column.columnDef.minSize;

                        return (
                          <div
                            key={header.id}
                            className={`flex p-2 text-sm align-middle [&:has([role=checkbox])]:pr-0 ${
                              hasFlexSize ? 'flex-1' : ''
                            } ${shouldWrap ? 'items-start' : 'items-center'} ${
                              headerClassname || ''
                            } ${isAmountColumn ? 'justify-end' : ''}`}
                            style={{
                              ...(!hasFlexSize
                                ? {
                                    width: `${columnSize}px`,
                                    minWidth: `${minSize || columnSize}px`,
                                    flexShrink: 0,
                                  }
                                : {}),
                              ...(maxSize ? { maxWidth: `${maxSize}px` } : {}),
                              ...(shouldWrap
                                ? {
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word',
                                    whiteSpace: 'normal',
                                  }
                                : {}),
                            }}
                          >
                            {isAmountColumn ? footerContent : null}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          })()}
      </div>
    </div>
  );
}
