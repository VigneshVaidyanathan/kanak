'use client';

import { Input, Skeleton } from '@kanak/ui/';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  ColumnFilter as TanStackColumnFilter,
  useReactTable,
} from '@tanstack/react-table';
import { Search, X } from 'lucide-react';
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { DataTableColumnToggler } from './data-table-column-toggler';
import { comboboxFilterFn } from './data-table-combobox';
import { dateRangeFilterFn } from './data-table-filter-date-range';
import { numberRangeFilterFn } from './data-table-filter-number-range';
import { DataTableFilters } from './data-table-filters';
import { DataTablePagination } from './data-table-pagination';
import { DataTableRefresher } from './data-table-refresher';
import { DataTableRenderer } from './data-table-renderer';
import {
  ColumnFilter,
  ContextMenuActions,
  isComboboxFilter,
  isNumberRangeFilter,
  isRangeFilter,
  ServerActionFunction,
  ServerTableResponse,
} from './data-table-types';
import { createServerTableParams } from './data-table-utils';
import { useServerQuery } from './use-server-query';

export interface DataTableProps<TData, TArgs extends any[]> {
  data: TData[];
  columns: ColumnDef<TData>[];
  showRefresh?: boolean;
  refetchOnLoad?: boolean;
  serverAction?: ServerActionFunction<TArgs, TData>;
  queryKey?: unknown[];
  args?: TArgs;
  customSection?: React.ReactNode;
  isLoading?: boolean;
  searchPlaceholder?: string;
  onDataChange?: (data: TData[]) => void;
  defaultColumnSizing?: {
    size?: number;
    minSize?: number;
    maxSize?: number;
  };
  pagination?: boolean;
  initialPagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  enableRowSelection?: boolean;
  onSelectionChange?: (selectedRows: TData[]) => void;
  onFilteredRowsChange?: (filteredRows: TData[]) => void;
  emptyState?: React.ReactNode;
  contextMenuActions?: ContextMenuActions<TData>;
  serverSide?: boolean; // Enable server-side pagination, sorting, and filtering
  footerRow?: (rows: TData[]) => React.ReactNode; // Footer row renderer that receives filtered rows
  summarySection?: (rows: TData[]) => React.ReactNode; // Summary section renderer that receives filtered rows
  onRowDoubleClick?: (row: TData) => void; // Handler for double-click on table rows
}

export function DataTable<TData, TArgs extends any[]>({
  data: initialData,
  columns: columnDefinitions,
  showRefresh = true,
  refetchOnLoad,
  serverAction,
  queryKey,
  args,
  customSection,
  isLoading = false,
  searchPlaceholder = 'Search...',
  onDataChange,
  defaultColumnSizing,
  pagination = true,
  initialPagination,
  onPaginationChange,
  enableRowSelection = false,
  onSelectionChange,
  onFilteredRowsChange,
  emptyState,
  contextMenuActions,
  serverSide = false,
  footerRow,
  summarySection,
  onRowDoubleClick,
}: DataTableProps<TData, TArgs>) {
  const [data, setData] = useState(initialData ?? []);
  const [globalSearch, setGlobalSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<TanStackColumnFilter[]>(
    []
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [paginationState, setPaginationState] = useState<PaginationState>(
    initialPagination ?? {
      pageIndex: 0,
      pageSize: 30,
    }
  );

  // Sync data when initialData changes (only for client-side mode)
  useEffect(() => {
    if (!serverSide) {
      setData(initialData);
    }
  }, [initialData, serverSide]);

  // Sync pagination state when initialPagination changes (only if different)
  useEffect(() => {
    if (
      initialPagination &&
      (paginationState.pageIndex !== initialPagination.pageIndex ||
        paginationState.pageSize !== initialPagination.pageSize)
    ) {
      setPaginationState(initialPagination);
    }
  }, [initialPagination, paginationState.pageIndex, paginationState.pageSize]);

  // Transform filters and sorting for server-side mode
  const serverParams = useMemo(() => {
    if (!serverSide) return undefined;

    return createServerTableParams({
      pageIndex: paginationState.pageIndex,
      pageSize: paginationState.pageSize,
      sorting,
      globalFilter: globalSearch,
      columnFilters,
      columns: columnDefinitions,
    });
  }, [
    serverSide,
    paginationState.pageIndex,
    paginationState.pageSize,
    sorting,
    globalSearch,
    columnFilters,
    columnDefinitions,
  ]);

  // Use React Query for server-side fetching
  // Create a wrapper function that matches useServerQuery's expected signature
  const wrappedServerAction = useMemo(() => {
    if (!serverAction || !serverParams) return undefined;
    const wrapper = (...actionArgs: TArgs) => {
      return serverAction(...actionArgs, serverParams);
    };
    return wrapper as any as ServerActionFunction<TArgs, TData>;
  }, [serverAction, serverParams]);

  const queryResult = useServerQuery(wrappedServerAction as any, {
    queryKey: [
      ...(queryKey || []),
      'server-table',
      serverParams, // Include params in query key for caching
    ],
    args: (args || []) as any,
    enabled:
      serverSide && !!serverAction && !!serverParams && !!wrappedServerAction,
  });

  const { data: serverData, isLoading: isServerLoading } = queryResult;

  // Determine if we should show loading state
  const isTableLoading = serverSide ? isServerLoading : isLoading;

  // Determine table data source
  const tableData = useMemo(() => {
    if (isTableLoading) {
      return Array(5).fill({});
    }

    if (serverSide && serverData) {
      // Check if serverData is ServerTableResponse or array
      const isServerResponse =
        (serverData as ServerTableResponse<TData>).data !== undefined;
      return isServerResponse
        ? (serverData as ServerTableResponse<TData>).data
        : (serverData as TData[]);
    }

    return data;
  }, [isTableLoading, serverSide, serverData, data]);

  // Get total count for pagination
  const totalCount = useMemo(() => {
    if (serverSide && serverData) {
      const isServerResponse =
        (serverData as ServerTableResponse<TData>).data !== undefined;
      return isServerResponse
        ? (serverData as ServerTableResponse<TData>).totalCount
        : (serverData as TData[]).length;
    }
    return data.length;
  }, [serverSide, serverData, data]);

  // Get total pages for pagination
  const totalPages = useMemo(() => {
    if (serverSide && serverData) {
      const isServerResponse =
        (serverData as ServerTableResponse<TData>).data !== undefined;
      if (isServerResponse) {
        return (serverData as ServerTableResponse<TData>).totalPages;
      }
    }
    return Math.ceil(totalCount / paginationState.pageSize);
  }, [serverSide, serverData, totalCount, paginationState.pageSize]);

  // Create columns with loading skeleton support and default filter functions
  const columns = useMemo(() => {
    const processedColumns = columnDefinitions.map((column) => {
      const meta = column.meta as { filter?: ColumnFilter };

      // Add default filter function for combobox filters if not already defined
      // Only add client-side filter functions when not in server-side mode
      if (
        !serverSide &&
        meta?.filter &&
        isComboboxFilter(meta.filter) &&
        !column.filterFn
      ) {
        return {
          ...column,
          filterFn: comboboxFilterFn,
        };
      }

      // Add default filter function for date range filters if not already defined
      if (
        !serverSide &&
        meta?.filter &&
        isRangeFilter(meta.filter) &&
        !column.filterFn
      ) {
        return {
          ...column,
          filterFn: dateRangeFilterFn,
        };
      }

      // Add default filter function for number range filters if not already defined
      if (
        !serverSide &&
        meta?.filter &&
        isNumberRangeFilter(meta.filter) &&
        !column.filterFn
      ) {
        return {
          ...column,
          filterFn: numberRangeFilterFn,
        };
      }

      return column;
    });

    return isTableLoading
      ? processedColumns.map((column) => ({
          ...column,
          cell: () => (
            <div className="p-2 w-full">
              <Skeleton className="h-[14px] w-[80%] rounded" />
            </div>
          ),
        }))
      : processedColumns;
  }, [isTableLoading, columnDefinitions, serverSide]);

  // Initialize table
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Only use client-side row models when not in server-side mode
    ...(!serverSide && {
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      ...(pagination && { getPaginationRowModel: getPaginationRowModel() }),
    }),
    defaultColumn: defaultColumnSizing,
    initialState: {
      ...(pagination && {
        pagination: {
          pageIndex: 0,
          pageSize: 30,
        },
      }),
    },
    state: {
      pagination: paginationState,
      globalFilter: globalSearch,
      columnFilters: columnFilters,
      sorting: sorting,
      rowSelection: rowSelection,
    },
    enableRowSelection: enableRowSelection,
    enableGlobalFilter: true,
    onGlobalFilterChange: setGlobalSearch,
    globalFilterFn: 'includesString',
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      setPaginationState((prev) => {
        const newState =
          typeof updater === 'function' ? updater(prev) : updater;
        onPaginationChange?.(newState);
        return newState;
      });
    },
    onRowSelectionChange: setRowSelection,
    // Enable manual pagination/sorting/filtering when in server-side mode
    manualPagination: serverSide,
    manualSorting: serverSide,
    manualFiltering: serverSide,
    // Set page count for server-side pagination
    pageCount: serverSide ? totalPages : undefined,
  });

  // Apply global filter when search length > 2 (client-side only)
  useEffect(() => {
    if (!serverSide && globalSearch.length > 2) {
      table.setGlobalFilter(globalSearch);
    }
  }, [table, globalSearch, serverSide]);

  // Notify parent of selection changes
  useEffect(() => {
    if (enableRowSelection && onSelectionChange) {
      const selectedRows = table
        .getFilteredSelectedRowModel()
        .rows.map((row) => row.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, enableRowSelection, onSelectionChange, table]);

  // Notify parent of filtered rows changes
  useEffect(() => {
    if (onFilteredRowsChange) {
      const filteredRows = serverSide
        ? tableData
        : table.getFilteredRowModel().rows.map((row) => row.original);
      onFilteredRowsChange(filteredRows);
    }
  }, [
    tableData,
    globalSearch,
    columnFilters,
    sorting,
    serverSide,
    onFilteredRowsChange,
    table,
  ]);

  // Handle data refresh (client-side only)
  const handleDataRefreshed = (newData: TData[]) => {
    if (!serverSide) {
      setData(newData);
      onDataChange?.(newData);
    }
  };

  return (
    <div>
      <div className="flex items-start mb-2 mt-5 gap-2">
        <div className="relative w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="w-full pl-9 pr-9"
            placeholder={searchPlaceholder}
            value={globalSearch}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setGlobalSearch(event.target.value);
            }}
          />
          {globalSearch && (
            <button
              type="button"
              onClick={() => setGlobalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <DataTableFilters table={table} />

        <div className="flex-1 flex items-center gap-2 justify-end">
          {showRefresh && serverAction && queryKey && !serverSide && (
            <DataTableRefresher
              serverAction={serverAction as any}
              queryKey={queryKey}
              args={args}
              refetchOnLoad={refetchOnLoad ?? false}
              onDataRefreshed={handleDataRefreshed}
            />
          )}
          <DataTableColumnToggler table={table} />
          {customSection && <>{customSection}</>}
        </div>
      </div>

      {summarySection && (
        <div className="mb-4">
          {summarySection(
            serverSide
              ? tableData
              : table.getFilteredRowModel().rows.map((row) => row.original)
          )}
        </div>
      )}

      <DataTableRenderer
        table={table}
        emptyState={emptyState}
        contextMenuActions={contextMenuActions}
        footerRow={footerRow}
        onRowDoubleClick={onRowDoubleClick}
      />
      {pagination && (
        <DataTablePagination
          table={table}
          serverSide={serverSide}
          totalCount={serverSide ? totalCount : undefined}
        />
      )}
    </div>
  );
}
