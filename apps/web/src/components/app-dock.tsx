'use client';

import { Dock, DockIcon, DockItem } from '@/components/ui/shadcn-io/dock';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kanak/ui';
import {
  IconLayoutDashboard,
  IconPlus,
  IconReceipt,
  IconSettings,
  IconSparkles,
  IconWallet,
  IconCoins,
  IconChartBar,
} from '@tabler/icons-react';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

export type DockNavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
};

const getDockItems = (isActive: (href: string) => boolean): DockNavItem[] => [
  {
    title: 'Quick Add',
    href: '/quick-add',
    icon: (
      <IconPlus
        className={`h-5 w-5 ${isActive('/quick-add') ? 'text-white' : ''}`}
      />
    ),
  },
  {
    title: 'Ask AI',
    href: '/ask-ai',
    icon: (
      <IconSparkles
        className={`h-5 w-5 ${isActive('/ask-ai') ? 'text-white' : ''}`}
      />
    ),
  },
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: (
      <IconLayoutDashboard
        className={`h-5 w-5 ${isActive('/dashboard') ? 'text-white' : ''}`}
      />
    ),
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: (
      <IconReceipt
        className={`h-5 w-5 ${isActive('/transactions') ? 'text-white' : ''}`}
      />
    ),
  },
  {
    title: 'Budget',
    href: '/budget',
    icon: (
      <IconWallet
        className={`h-5 w-5 ${isActive('/budget') ? 'text-white' : ''}`}
      />
    ),
  },
  {
    title: 'Wealth',
    href: '/wealth',
    icon: (
      <IconCoins
        className={`h-5 w-5 ${isActive('/wealth') ? 'text-white' : ''}`}
      />
    ),
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: (
      <IconChartBar
        className={`h-5 w-5 ${isActive('/reports') ? 'text-white' : ''}`}
      />
    ),
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: (
      <IconSettings
        className={`h-5 w-5 ${isActive('/settings') ? 'text-white' : ''}`}
      />
    ),
  },
];

export function AppDock() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (href: string): boolean => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const dockItems = getDockItems(isActive);

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto">
        <Dock>
          {dockItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <div
                  onClick={() => router.push(item.href)}
                  className="cursor-pointer"
                >
                  <DockItem
                    className={
                      isActive(item.href) ? 'bg-primary' : 'opacity-70'
                    }
                  >
                    <DockIcon>{item.icon}</DockIcon>
                  </DockItem>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="mb-2 [&>svg]:hidden">
                {item.title}
              </TooltipContent>
            </Tooltip>
          ))}
        </Dock>
      </div>
    </div>
  );
}
