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

  const invites = useQuery(
    api.workspaces.listInvites,
    active ? { workspaceId: active.id as Id<'workspaces'> } : 'skip'
  );

  const pin = useQuery(
    api.workspaces.workspacePin,
    active ? { workspaceId: active.id as Id<'workspaces'> } : 'skip'
  );

  const rename = useMutation(api.workspaces.renameWorkspace);
  const setPin = useMutation(api.workspaces.setWorkspacePin);
  const addMember = useMutation(api.workspaces.addMember);
  const removeMember = useMutation(api.workspaces.removeMember);
  const revokeInvite = useMutation(api.workspaces.revokeInvite);

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
        <h2 className="text-lg font-semibold">Switch code</h2>
        <p className="text-sm text-muted-foreground">
          Asked for before anyone switches into this family from another one.
          Everyone here can see it.
        </p>
        <div className="flex items-center gap-2 max-w-md">
          <span className="font-mono text-lg tracking-[0.3em]">
            {pin ?? '——————'}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setPin({ workspaceId })
                .then(() => toast.success('New switch code generated'))
                .catch((err) => toast.error(message(err)))
                .finally(() => setBusy(false));
            }}
          >
            {pin ? 'Generate a new one' : 'Generate a code'}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Members</h2>
        <p className="text-sm text-muted-foreground">
          Everyone here sees and edits this family&apos;s transactions, budgets
          and net worth. Someone with an account is added straight away; someone
          without one is invited, and joins when they sign up with that email.
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

        {invites && invites.length > 0 && (
          <ul className="flex flex-col divide-y rounded-md border border-dashed max-w-md mt-2">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{invite.email}</span>
                  <span className="text-xs text-muted-foreground">
                    Invited — waiting for them to sign up
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(signUpLink(invite.email))
                        .then(() => toast.success('Sign-up link copied'))
                        .catch(() => toast.error('Could not copy the link'));
                    }}
                  >
                    Copy link
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Cancel invite for ${invite.email}`}
                    onClick={() => {
                      revokeInvite({ inviteId: invite.id })
                        .then(() => toast.success('Invite cancelled'))
                        .catch((err) => toast.error(message(err)));
                    }}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

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
                  result.added
                    ? 'Member added'
                    : result.invited
                      ? 'Invited — send them the sign-up link'
                      : 'Already a member'
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

// ponytail: no email is sent, so the inviter passes this along themselves.
// Wire it to a mailer when "they never got the invite" starts happening.
function signUpLink(email: string) {
  return `${window.location.origin}/signup?email=${encodeURIComponent(email)}`;
}
