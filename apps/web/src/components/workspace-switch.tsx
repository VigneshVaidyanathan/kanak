'use client';

import { convexErrorMessage } from '@/lib/convex-error';
import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@kanak/ui';
import { useConvex, useMutation } from 'convex/react';
import { useState } from 'react';
import { toast } from 'sonner';

type Workspace = {
  id: string;
  name: string;
  isActive: boolean;
  hasPin?: boolean;
};

/**
 * Switching workspaces, with the family's 6-digit code asked for first.
 *
 * The code is only checked server-side (`setActiveWorkspace`); this dialog
 * collects it and shows what comes back. A workspace with no code set still
 * switches straight away.
 *
 * Returns the dialog as a node for the caller to render, since the thing that
 * triggers the switch is the navbar menu, not this component.
 */
export function useWorkspaceSwitch() {
  const setActiveWorkspace = useMutation(api.workspaces.setActiveWorkspace);
  // Fetched on click rather than subscribed: the code must not sit in the
  // page for every workspace in the switcher.
  const convex = useConvex();
  const [pending, setPending] = useState<Workspace | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Convex re-runs every subscribed query once the user document changes, so
  // there is nothing to invalidate or navigate after a switch.
  const switchTo = (workspace: Workspace, pin?: string) => {
    setBusy(true);
    setError(null);
    return setActiveWorkspace({
      workspaceId: workspace.id as Id<'workspaces'>,
      pin,
    })
      .then(() => setPending(null))
      .catch((err) => {
        const message = convexErrorMessage(err);
        if (pin === undefined) toast.error(message);
        else setError(message);
      })
      .finally(() => setBusy(false));
  };

  const select = (workspace: Workspace) => {
    if (workspace.isActive) return;
    if (!workspace.hasPin) {
      void switchTo(workspace);
      return;
    }
    setPin('');
    setError(null);
    setPending(workspace);
  };

  const dialog = (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) setPending(null);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Switch to {pending?.name}</DialogTitle>
          <DialogDescription>
            Enter this family&apos;s 6-digit code to switch into it.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!pending || pin.length !== 6 || busy) return;
            void switchTo(pending, pin);
          }}
        >
          <Input
            autoFocus
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            placeholder="000000"
            className="text-center text-lg tracking-[0.4em]"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
              setError(null);
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {/* ponytail: recovery is "print it to the console" — any member can
              read the code in settings anyway, so this gives away nothing new.
              Swap for an email to the family if that stops being true. */}
          <Button
            type="button"
            variant="link"
            className="self-start px-0"
            onClick={() => {
              if (!pending) return;
              void convex
                .query(api.workspaces.workspacePin, {
                  workspaceId: pending.id as Id<'workspaces'>,
                })
                .then((code) => {
                  // Reached through `globalThis` on purpose: next.config.js
                  // sets `compiler.removeConsole` in production, and that
                  // transform only strips bare `console.*` calls.
                  globalThis.console.log(
                    `Switch code for ${pending.name}: ${code}`
                  );
                  toast.success('Switch code logged to the console');
                })
                .catch((err) => toast.error(convexErrorMessage(err)));
            }}
          >
            Forgot the code?
          </Button>
          <DialogFooter>
            <Button type="submit" disabled={busy || pin.length !== 6}>
              Switch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return { select, dialog };
}
