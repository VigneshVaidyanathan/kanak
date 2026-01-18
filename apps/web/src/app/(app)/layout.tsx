'use client';

import { AuthGuard } from '@/components/auth-guard';
import { UpdateBanner } from '@/components/update-banner';
import { Navbar09 } from '@/components/ui/shadcn-io/navbar-09';
import { useAuthStore } from '@/store/auth-store';
import { DeviceProvider, Toaster } from '@kanak/ui';
import {
  IconFileText,
  IconLayoutDashboard,
  IconReceipt,
  IconChartBar,
  IconCoin,
  IconSettings,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  const handleUserItemClick = (item: string) => {
    if (item === 'logout') {
      clearAuth();
      router.push('/auth');
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
      />
      <div className="flex-1 p-5 pb-24 bg-gray-50 flex flex-col container mx-auto">
        <UpdateBanner />
        {children}
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DeviceProvider>
      <AuthGuard>
        <AppLayoutContent>{children}</AppLayoutContent>
      </AuthGuard>
    </DeviceProvider>
  );
}
