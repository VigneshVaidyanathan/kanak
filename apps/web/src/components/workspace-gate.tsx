'use client';

import { convexErrorMessage } from '@/lib/convex-error';
import { api } from '@kanak/convex/src/_generated/api';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from '@kanak/ui';
import { useMutation, useQuery } from 'convex/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Holds the app until the user is looking at a workspace.
 *
 * Every data query resolves its workspace server-side from the user document,
 * so one mounted before a workspace is chosen throws "No workspace selected"
 * and takes the page down — the same failure mode the `<Authenticated>` gate
 * around this one exists to prevent.
 */
export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const workspaces = useQuery(api.workspaces.myWorkspaces, {});
  // `?newWorkspace=1` is how the navbar's "New workspace" item reaches this
  // screen. A query param rather than server state: leaving the page, or
  // reloading without it, puts you straight back into the active workspace.
  const router = useRouter();
  const pathname = usePathname();
  const creating = useSearchParams().get('newWorkspace') === '1';
  const setActive = useMutation(api.workspaces.setActiveWorkspace);
  const createWorkspace = useMutation(api.workspaces.createWorkspace);

  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One auto-select attempt per mount: a failed mutation must not retry forever.
  const autoSelected = useRef(false);

  const onlyOne = workspaces?.length === 1 ? workspaces[0] : undefined;
  const hasActive = workspaces?.some((w) => w.isActive) ?? false;

  useEffect(() => {
    if (!onlyOne || hasActive || autoSelected.current) return;
    autoSelected.current = true;
    void setActive({ workspaceId: onlyOne.id }).catch((e) =>
      setError(convexErrorMessage(e))
    );
  }, [onlyOne, hasActive, setActive]);

  if (workspaces === undefined) {
    return null;
  }

  if (hasActive && !creating) {
    return <>{children}</>;
  }

  if (creating || workspaces.length === 0) {
    return (
      <Centered title="Create a family">
        <p className="text-sm text-muted-foreground">
          A family is one household&apos;s finances. Everyone you add to it sees
          and edits the same transactions, budgets and net worth.
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || busy) return;
            setBusy(true);
            setError(null);
            void createWorkspace({ name })
              .then(() => {
                setName('');
                if (creating) router.replace(pathname);
              })
              .catch((err) => setError(convexErrorMessage(err)))
              .finally(() => setBusy(false));
          }}
        >
          <Input
            autoFocus
            placeholder="The Smiths"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={busy || !name.trim()}>
            Create
          </Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {creating && hasActive && (
          <Button
            variant="ghost"
            className="self-start px-0"
            onClick={() => router.replace(pathname)}
          >
            Cancel
          </Button>
        )}
      </Centered>
    );
  }

  // Several workspaces and none active: the user picks. A single workspace is
  // auto-selected by the effect above, so this screen never shows one option.
  return (
    <Centered title="Choose a family">
      <div className="flex flex-col gap-2">
        {workspaces.map((workspace) => (
          <Button
            key={workspace.id}
            variant="outline"
            className="justify-start"
            onClick={() => {
              void setActive({ workspaceId: workspace.id }).catch((e) =>
                setError(convexErrorMessage(e))
              );
            }}
          >
            {workspace.name}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </Centered>
  );
}

function Centered({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
    </div>
  );
}
