'use client';

import { UpdateBanner } from '@/components/update-banner';
import { WorkspaceGate } from '@/components/workspace-gate';
import { useWorkspaceSwitch } from '@/components/workspace-switch';
import { Navbar09 } from '@/components/ui/shadcn-io/navbar-09';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@kanak/convex/src/_generated/api';
import { DeviceProvider, Toaster } from '@kanak/ui';
import {
  IconFileText,
  IconLayoutDashboard,
  IconReceipt,
  IconChartBar,
  IconCoin,
  IconSettings,
  IconCalendar,
} from '@tabler/icons-react';
import { Authenticated, useQuery } from 'convex/react';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const user = useQuery(api.users.viewer, {});
  const workspaces = useQuery(api.workspaces.myWorkspaces, {});
  const { select: selectWorkspace, dialog: workspacePinDialog } =
    useWorkspaceSwitch();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();

  const handleUserItemClick = (item: string) => {
    if (item === 'logout') {
      // Convex Auth owns the session cookie; clearing the local store alone
      // would leave the user signed in.
      void signOut().then(() => router.push('/auth'));
    } else if (item === 'settings') {
      router.push('/settings');
    }
  };

  const handleNavItemClick = (href: string) => {
    router.push(href);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar09
        logo={<IconFileText className="h-6 w-6" />}
        logoHref="/"
        navigationLinks={[
          { href: '/', label: 'Dashboard', icon: IconLayoutDashboard },
          { href: '/transactions', label: 'Transactions', icon: IconReceipt },
          { href: '/calendar', label: 'Calendar', icon: IconCalendar },
          { href: '/budget', label: 'Budget', icon: IconChartBar },
          { href: '/reports', label: 'Reports', icon: IconChartBar },
          { href: '/wealth', label: 'Wealth', icon: IconCoin },
        ]}
        searchPlaceholder="Search..."
        userName={user?.name || 'User'}
        userEmail={user?.email || ''}
        onNavItemClick={handleNavItemClick}
        onUserItemClick={handleUserItemClick}
        notificationCount={0}
        messageIndicator={false}
        workspaces={workspaces ?? []}
        onWorkspaceSelect={(id) => {
          const workspace = workspaces?.find((w) => w.id === id);
          if (workspace) selectWorkspace(workspace);
        }}
        onCreateWorkspace={() => router.push(`${pathname}?newWorkspace=1`)}
      />
      <div className="flex-1 p-5 pb-24 bg-gray-50 flex flex-col container mx-auto">
        <UpdateBanner />
        {/* Convex resolves the auth token after the first client render, so a
            query fired before it lands throws Unauthorized and takes the page
            down. The gate holds the subscriptions until the token exists. */}
        <Authenticated>
          {/* WorkspaceGate reads a search param, which opts a route out of
              static rendering unless it sits behind a Suspense boundary. */}
          <Suspense>
            <WorkspaceGate>{children}</WorkspaceGate>
          </Suspense>
        </Authenticated>
      </div>
      {workspacePinDialog}
      <Toaster position="top-right" />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DeviceProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </DeviceProvider>
  );
}
