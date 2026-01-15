import { useEffect, useState } from 'react';

export interface UseServerQueryOptions<TArgs extends any[]> {
  queryKey?: unknown[];
  args?: TArgs;
  enabled?: boolean;
}

export interface UseServerQueryResult<TData> {
  data: TData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Simple hook for server-side data fetching
 * This is a simplified version - in production you might want to use React Query
 */
export function useServerQuery<TArgs extends any[], TData>(
  serverAction: ((...args: TArgs) => Promise<TData>) | undefined,
  options: UseServerQueryOptions<TArgs> = {}
): UseServerQueryResult<TData> {
  const { queryKey, args = [] as any, enabled = true } = options;
  const [data, setData] = useState<TData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!serverAction || !enabled) return;

    setIsFetching(true);
    setIsLoading(true);
    setError(null);

    try {
      const result = await serverAction(...args);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (enabled && serverAction) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, serverAction, JSON.stringify(queryKey), JSON.stringify(args)]);

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch: fetchData,
  };
}
