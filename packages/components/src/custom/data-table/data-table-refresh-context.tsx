'use client';

import * as React from 'react';
import { createContext, useContext, useState } from 'react';

interface DataTableRefreshContextType {
  refresh: (() => void) | null;
  isRefreshing: boolean;
  setRefresh: (refreshFn: () => void) => void;
  setIsRefreshing: (isRefreshing: boolean) => void;
}

export const DataTableRefreshContext = createContext<
  DataTableRefreshContextType | undefined
>(undefined);

export function DataTableRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [refresh, setRefresh] = useState<(() => void) | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  return (
    <DataTableRefreshContext.Provider
      value={{
        refresh,
        isRefreshing,
        setRefresh,
        setIsRefreshing,
      }}
    >
      {children}
    </DataTableRefreshContext.Provider>
  );
}

export function useDataTableRefresh() {
  const context = useContext(DataTableRefreshContext);

  // If context is not available, return no-op functions
  // This allows components to use the hook without requiring the provider
  if (context === undefined) {
    return {
      refresh: null,
      isRefreshing: false,
    };
  }

  return {
    refresh: context.refresh,
    isRefreshing: context.isRefreshing,
  };
}
