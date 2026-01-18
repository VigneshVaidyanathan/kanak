'use client';

import { useUpdateChecker } from '@/hooks/use-update-checker';
import { Alert, AlertDescription, AlertTitle, Button } from '@kanak/ui';
import { IconDownload, IconX } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

const DISMISS_KEY_PREFIX = 'update-banner-dismissed-';

export function UpdateBanner(): JSX.Element | null {
  const {
    hasUpdate,
    latestVersion,
    currentVersion,
    changelog,
    isLoading,
    error,
  } = useUpdateChecker();
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !latestVersion) {
      return false;
    }

    try {
      const dismissedVersion = localStorage.getItem(
        `${DISMISS_KEY_PREFIX}${latestVersion}`
      );
      return dismissedVersion === 'true';
    } catch {
      return false;
    }
  });

  const updateUrl = useMemo((): string | null => {
    const userRepoOwner = process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER;
    const userRepoSlug = process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG;
    const upstreamOwner = process.env.NEXT_PUBLIC_UPSTREAM_OWNER || 'vignesh';
    const upstreamRepo = process.env.NEXT_PUBLIC_UPSTREAM_REPO || 'voka';

    if (!userRepoOwner || !userRepoSlug) {
      return null;
    }

    // GitHub compare URL format: https://github.com/[USER_REPO_OWNER]/[USER_REPO_SLUG]/compare/main...[UPSTREAM_OWNER]:[UPSTREAM_REPO]:main
    return `https://github.com/${userRepoOwner}/${userRepoSlug}/compare/main...${upstreamOwner}:${upstreamRepo}:main`;
  }, []);

  const handleDismiss = (): void => {
    if (latestVersion) {
      try {
        localStorage.setItem(`${DISMISS_KEY_PREFIX}${latestVersion}`, 'true');
        setIsDismissed(true);
      } catch {
        // Ignore localStorage errors
      }
    }
  };

  // Don't show if loading, error, no update, or dismissed
  if (isLoading || error || !hasUpdate || isDismissed || !updateUrl) {
    return null;
  }

  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <IconDownload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-900 dark:text-blue-100">
        Update Available
      </AlertTitle>
      <AlertDescription className="space-y-3 text-blue-800 dark:text-blue-200">
        <div>
          <p className="font-medium">
            A new version is available: <strong>{latestVersion}</strong>
          </p>
          <p className="text-sm">
            You are currently running version <strong>{currentVersion}</strong>
          </p>
        </div>

        {changelog && (
          <div className="rounded-md bg-blue-100 p-3 text-sm dark:bg-blue-900">
            <p className="font-medium mb-1">What&apos;s new:</p>
            <p>{changelog}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <a
              href={updateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              <IconDownload className="h-4 w-4" />
              Update Now
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900"
          >
            <IconX className="h-4 w-4" />
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
