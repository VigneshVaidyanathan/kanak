'use client';

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@kanak/ui/';
import { DataTableRefreshContext } from './data-table-refresh-context';
import { useServerQuery } from './use-server-query';
import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { useContext, useEffect, useRef, useState } from 'react';

type ServerActionFunction<TArgs extends any[], TData> = (
  ...args: TArgs
) => Promise<TData>;

interface DataTableRefresherProps<TArgs extends any[], TData> {
  /**
   * Server action function to call when refreshing data
   */
  serverAction: ServerActionFunction<TArgs, TData>;
  /**
   * Unique key for this query. Used for caching and invalidation.
   */
  queryKey: unknown[];
  /**
   * Arguments to pass to the server action.
   * If the server action requires no arguments, pass an empty array [].
   */
  args?: TArgs;

  refetchOnLoad: boolean;

  onDataRefreshed: (data: any) => void;
}

export function DataTableRefresher<TArgs extends any[], TData>({
  serverAction,
  queryKey,
  args = [] as unknown as TArgs,
  refetchOnLoad = false,
  onDataRefreshed,
}: DataTableRefresherProps<TArgs, TData>) {
  const context = useContext(DataTableRefreshContext);
  const { isFetching, refetch, data } = useServerQuery(serverAction, {
    queryKey,
    args,
    enabled: true,
  });
  const [showRefreshed, setShowRefreshed] = useState(false);
  const prevIsFetchingRef = useRef(isFetching);

  // Register the refresh function in the context
  useEffect(() => {
    if (context && !context.refresh) {
      context.setRefresh(() => () => {
        refetch();
      });
    }
  }, [context, refetch]);

  // Update the isRefreshing state in the context
  useEffect(() => {
    if (context) {
      context.setIsRefreshing(isFetching);
    }
  }, [context, isFetching]);

  useEffect(() => {
    if (data) {
      onDataRefreshed(data);
    }
  }, [data]);

  useEffect(() => {
    if (refetchOnLoad) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show "Data refreshed" message after refresh completes
  useEffect(() => {
    // Detect transition from fetching to not fetching
    if (prevIsFetchingRef.current && !isFetching) {
      setShowRefreshed(true);
      const timeout = setTimeout(() => {
        setShowRefreshed(false);
      }, 1000);
      return () => clearTimeout(timeout);
    }
    // Update the ref for the next render
    prevIsFetchingRef.current = isFetching;
  }, [isFetching]);

  return (
    <div className="text-sm text-foreground flex items-center gap-2">
      {isFetching
        ? 'Refreshing data ...'
        : showRefreshed
          ? 'Data refreshed'
          : ''}
      <Tooltip>
        <TooltipContent>
          <div>Refresh data</div>
        </TooltipContent>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={isFetching ? 'animate-spin' : ''} />
          </Button>
        </TooltipTrigger>
      </Tooltip>
    </div>
  );
}
