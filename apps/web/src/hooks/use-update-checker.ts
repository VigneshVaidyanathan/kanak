'use client';

import { useEffect, useState } from 'react';

interface VersionInfo {
  version: string;
  title: string;
  changelog: string;
}

interface UseUpdateCheckerResult {
  hasUpdate: boolean;
  latestVersion: string | null;
  currentVersion: string;
  changelog: string | null;
  isLoading: boolean;
  error: Error | null;
}

const CACHE_KEY = 'update-checker-cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CacheData {
  data: UseUpdateCheckerResult;
  timestamp: number;
}

function getCachedResult(): UseUpdateCheckerResult | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return null;
    }

    const parsed: CacheData = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - parsed.timestamp < CACHE_DURATION) {
      return parsed.data;
    }

    // Cache expired, remove it
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function setCachedResult(result: UseUpdateCheckerResult): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const cacheData: CacheData = {
      data: result,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch {
    // Ignore localStorage errors
  }
}

function compareVersions(version1: string, version2: string): number {
  // Simple version comparison - can be enhanced with semver library
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part > v2Part) {
      return 1;
    }
    if (v1Part < v2Part) {
      return -1;
    }
  }

  return 0;
}

export function useUpdateChecker(): UseUpdateCheckerResult {
  const [result, setResult] = useState<UseUpdateCheckerResult>(() => {
    // Try to get cached result first
    const cached = getCachedResult();
    if (cached) {
      return cached;
    }

    return {
      hasUpdate: false,
      latestVersion: null,
      currentVersion: '1.0.0',
      changelog: null,
      isLoading: true,
      error: null,
    };
  });

  useEffect(() => {
    async function checkForUpdates(): Promise<void> {
      // Get upstream repository configuration
      const upstreamOwner = process.env.NEXT_PUBLIC_UPSTREAM_OWNER || 'vignesh';
      const upstreamRepo = process.env.NEXT_PUBLIC_UPSTREAM_REPO || 'voka';

      // Check cache first
      const cached = getCachedResult();
      if (cached && !cached.isLoading) {
        setResult(cached);
        return;
      }

      setResult((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // First, get current version from API
        const versionResponse = await fetch('/api/version', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!versionResponse.ok) {
          throw new Error('Failed to get current version');
        }

        const versionData: { version: string } = await versionResponse.json();
        const currentVersion = versionData.version;

        // Construct GitHub raw URL
        const versionJsonUrl = `https://raw.githubusercontent.com/${upstreamOwner}/${upstreamRepo}/main/version.json`;

        // Fetch upstream version
        const response = await fetch(versionJsonUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch version: ${response.status} ${response.statusText}`
          );
        }

        const data: VersionInfo = await response.json();

        if (!data.version) {
          throw new Error('Invalid version.json: missing version field');
        }

        const hasUpdate = compareVersions(data.version, currentVersion) > 0;

        const updateResult: UseUpdateCheckerResult = {
          hasUpdate,
          latestVersion: data.version,
          currentVersion,
          changelog: data.changelog || null,
          isLoading: false,
          error: null,
        };

        // Cache the result
        setCachedResult(updateResult);
        setResult(updateResult);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        const errorResult: UseUpdateCheckerResult = {
          hasUpdate: false,
          latestVersion: null,
          currentVersion: '1.0.0', // Fallback
          changelog: null,
          isLoading: false,
          error,
        };

        setResult(errorResult);
      }
    }

    checkForUpdates();
  }, []);

  return result;
}
