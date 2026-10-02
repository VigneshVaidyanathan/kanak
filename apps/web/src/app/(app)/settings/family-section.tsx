'use client';

import { convexErrorMessage as message } from '@/lib/convex-error';
import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import { Button, Input } from '@kanak/ui';
import { IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function FamilySection() {
  const workspaces = useQuery(api.workspaces.myWorkspaces, {});
  const active = workspaces?.find((w) => w.isActive);

  const members = useQuery(
    api.workspaces.listMembers,
    active ? { workspaceId: active.id as Id<'workspaces'> } : 'skip'
  );

  const rename = useMutation(api.workspaces.renameWorkspace);
  const addMember = useMutation(api.workspaces.addMember);
  const removeMember = useMutation(api.workspaces.removeMember);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  // The field is a draft of the stored name, so it has to pick the real one up
  // once the query resolves — and again if someone else renames the family.
  useEffect(() => {
    if (active) setName(active.name);
  }, [active]);

  if (!active) {
    return null;
  }

  const workspaceId = active.id as Id<'workspaces'>;
  const renamed = name.trim() !== active.name;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Family name</h2>
        <p className="text-sm text-muted-foreground">
          What this family is called across the app.
        </p>
        <form
          className="flex gap-2 max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            if (!renamed || busy) return;
            setBusy(true);
            rename({ workspaceId, name })
              .then(() => toast.success('Family renamed'))
              .catch((err) => toast.error(message(err)))
              .finally(() => setBusy(false));
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={busy || !renamed || !name.trim()}>
            Save
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Members</h2>
        <p className="text-sm text-muted-foreground">
          Everyone here sees and edits this family&apos;s transactions, budgets
          and net worth. There is no invite step — adding someone gives them
          access straight away.
        </p>

        <ul className="flex flex-col divide-y rounded-md border max-w-md">
          {members?.map((member) => (
            <li
              key={member.userId}
              className="flex items-center justify-between gap-2 px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {member.name || member.email}
                  {member.isSelf && (
                    <span className="text-muted-foreground"> (you)</span>
                  )}
                </span>
                {member.name && (
                  <span className="text-xs text-muted-foreground">
                    {member.email}
                  </span>
                )}
              </div>
              {(members?.length ?? 0) > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${member.email ?? 'member'}`}
                  onClick={() => {
                    removeMember({ workspaceId, userId: member.userId })
                      .then(() => toast.success('Member removed'))
                      .catch((err) => toast.error(message(err)));
                  }}
                >
                  <IconTrash className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>

        <form
          className="flex gap-2 max-w-md mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim() || busy) return;
            setBusy(true);
            addMember({ workspaceId, email })
              .then((result) => {
                setEmail('');
                toast.success(
                  result.added ? 'Member added' : 'Already a member'
                );
              })
              .catch((err) => toast.error(message(err)))
              .finally(() => setBusy(false));
          }}
        >
          <Input
            type="email"
            placeholder="them@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" disabled={busy || !email.trim()}>
            Add
          </Button>
        </form>
      </section>
    </div>
  );
}
