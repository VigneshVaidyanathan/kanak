'use client';

import { Dock, DockIcon, DockItem } from '@/components/ui/shadcn-io/dock';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@kanak/ui';
import {
  IconChartBar,
  IconCoins,
  IconLayoutDashboard,
  IconPlus,
  IconReceipt,
  IconSettings,
  IconSparkles,
  IconWallet,
} from '@tabler/icons-react';
import { BellIcon, ChevronDownIcon, MailIcon } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { useEffect, useId, useRef, useState } from 'react';

// Simple logo component for the navbar
const Logo = (props: React.SVGAttributes<SVGElement>) => {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 324 323"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...(props as any)}
    >
      <rect
        x="88.1023"
        y="144.792"
        width="151.802"
        height="36.5788"
        rx="18.2894"
        transform="rotate(-38.5799 88.1023 144.792)"
        fill="currentColor"
      />
      <rect
        x="85.3459"
        y="244.537"
        width="151.802"
        height="36.5788"
        rx="18.2894"
        transform="rotate(-38.5799 85.3459 244.537)"
        fill="currentColor"
      />
    </svg>
  );
};

// Hamburger icon component
const HamburgerIcon = ({
  className,
  ...props
}: React.SVGAttributes<SVGElement>) => (
  <svg
    className={cn('pointer-events-none', className)}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...(props as any)}
  >
    <path
      d="M4 12L20 12"
      className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
    />
    <path
      d="M4 12H20"
      className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
    />
    <path
      d="M4 12H20"
      className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
    />
  </svg>
);

// Notification Menu Component
const NotificationMenu = ({
  notificationCount = 3,
  onItemClick,
}: {
  notificationCount?: number;
  onItemClick?: (item: string) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative rounded-full"
      >
        <BellIcon size={16} />
        {notificationCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
            {notificationCount > 9 ? '9+' : notificationCount}
          </Badge>
        )}
        <span className="sr-only">Notifications</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-80">
      <DropdownMenuLabel>Notifications</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onItemClick?.('notification1')}>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">New message received</p>
          <p className="text-xs text-muted-foreground">2 minutes ago</p>
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onItemClick?.('notification2')}>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">System update available</p>
          <p className="text-xs text-muted-foreground">1 hour ago</p>
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onItemClick?.('notification3')}>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Weekly report ready</p>
          <p className="text-xs text-muted-foreground">3 hours ago</p>
        </div>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onItemClick?.('view-all')}>
        View all notifications
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

// User Menu Component
const UserMenu = ({
  userName = 'John Doe',
  userEmail = 'john@example.com',
  userAvatar,
  onItemClick,
}: {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onItemClick?: (item: string) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        className="h-9 px-2 py-0 hover:bg-accent hover:text-accent-foreground"
      >
        <Avatar className="h-7 w-7">
          <AvatarImage src={userAvatar} alt={userName} />
          <AvatarFallback className="text-xs">
            {userName
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
        <ChevronDownIcon className="h-3 w-3 ml-1" />
        <span className="sr-only">User menu</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel>
        <div className="flex flex-col space-y-1">
          <p className="text-sm font-medium leading-none">{userName}</p>
          <p className="text-xs leading-none text-muted-foreground">
            {userEmail}
          </p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onItemClick?.('profile')}>
        Profile
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onItemClick?.('settings')}>
        Settings
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onItemClick?.('billing')}>
        Billing
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onItemClick?.('logout')}>
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

// Types
export interface Navbar09NavItem {
  href?: string;
  label: string;
  icon: React.ComponentType<any>;
}

export interface Navbar09Props extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode;
  logoHref?: string;
  navigationLinks?: Navbar09NavItem[];
  searchPlaceholder?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  notificationCount?: number;
  messageIndicator?: boolean;
  onNavItemClick?: (href: string) => void;
  onSearchSubmit?: (query: string) => void;
  onMessageClick?: () => void;
  onNotificationItemClick?: (item: string) => void;
  onUserItemClick?: (item: string) => void;
}

type DockNavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<any>;
};

const getDockItems = (isActive: (href: string) => boolean): DockNavItem[] => [
  {
    title: 'Quick Add',
    href: '/quick-add',
    icon: IconPlus,
  },
  {
    title: 'Ask AI',
    href: '/ask-ai',
    icon: IconSparkles,
  },
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: IconLayoutDashboard,
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: IconReceipt,
  },
  {
    title: 'Budget',
    href: '/budget',
    icon: IconWallet,
  },
  {
    title: 'Wealth',
    href: '/wealth',
    icon: IconCoins,
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: IconChartBar,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: IconSettings,
  },
];

export const Navbar09 = React.forwardRef<HTMLElement, Navbar09Props>(
  (
    {
      className,
      logo = <Logo />,
      logoHref = '#',
      navigationLinks,
      searchPlaceholder = 'Search...',
      userName = 'John Doe',
      userEmail = 'john@example.com',
      userAvatar,
      notificationCount = 3,
      messageIndicator = true,
      onNavItemClick,
      onSearchSubmit,
      onMessageClick,
      onNotificationItemClick,
      onUserItemClick,
      ...props
    },
    ref
  ) => {
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLElement>(null);
    const searchId = useId();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
      const checkWidth = () => {
        if (containerRef.current) {
          const width = containerRef.current.offsetWidth;
          setIsMobile(width < 768); // 768px is md breakpoint
        }
      };

      checkWidth();

      const resizeObserver = new ResizeObserver(checkWidth);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    // Combine refs
    const combinedRef = React.useCallback(
      (node: HTMLElement | null) => {
        if (containerRef) {
          (containerRef as React.MutableRefObject<HTMLElement | null>).current =
            node;
        }
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLElement | null>).current = node;
        }
      },
      [ref]
    );

    const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const query = formData.get('search') as string;
      if (onSearchSubmit) {
        onSearchSubmit(query);
      }
    };

    const isActive = (href: string): boolean => {
      return pathname === href || pathname.startsWith(`${href}/`);
    };

    const dockItems = getDockItems(isActive);

    return (
      <>
        <header
          ref={combinedRef}
          className={cn(
            'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 [&_*]:no-underline',
            className
          )}
          {...(props as any)}
        >
          <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-4">
            {/* Left side */}
            <div className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-6">
                <button
                  onClick={(e) => e.preventDefault()}
                  className="flex items-center space-x-2 text-primary hover:text-primary/90 transition-colors cursor-pointer"
                >
                  <div className="text-base">{logo}</div>
                  <span className="font-bold text-lg">Kanak</span>
                </button>
              </div>
            </div>
            {/* Middle area - Desktop navigation icons */}
            {!isMobile && (
              <div className="flex items-center gap-2">
                {dockItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            if (onNavItemClick) {
                              onNavItemClick(item.href);
                            } else {
                              router.push(item.href);
                            }
                          }}
                          className={cn(
                            'flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer',
                            active && 'bg-primary text-primary-foreground'
                          )}
                          aria-label={item.title}
                        >
                          <Icon
                            size={16}
                            className={active ? 'text-white' : ''}
                            aria-hidden={true}
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="[&>svg]:hidden">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            )}
            {/* Right side */}
            <div className="flex flex-1 items-center justify-end gap-4">
              <div className="flex items-center gap-2">
                {/* Messages */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground relative size-8 rounded-full shadow-none"
                  aria-label="Open messages"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onMessageClick) onMessageClick();
                  }}
                >
                  <MailIcon size={16} aria-hidden={true} />
                  {messageIndicator && (
                    <div
                      aria-hidden={true}
                      className="bg-primary absolute top-0.5 right-0.5 size-1 rounded-full"
                    />
                  )}
                </Button>
                {/* Notification menu */}
                <NotificationMenu
                  notificationCount={notificationCount}
                  onItemClick={onNotificationItemClick}
                />
              </div>
              {/* User menu */}
              <UserMenu
                userName={userName}
                userEmail={userEmail}
                userAvatar={userAvatar}
                onItemClick={onUserItemClick}
              />
            </div>
          </div>
        </header>
        {/* Mobile dock - fixed at bottom */}
        {isMobile && (
          <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="pointer-events-auto">
              <Dock>
                {dockItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => {
                            if (onNavItemClick) {
                              onNavItemClick(item.href);
                            } else {
                              router.push(item.href);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <DockItem
                            className={active ? 'bg-primary' : 'opacity-70'}
                          >
                            <DockIcon>
                              <Icon
                                size={20}
                                className={active ? 'text-white' : ''}
                              />
                            </DockIcon>
                          </DockItem>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="mb-2 [&>svg]:hidden"
                      >
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </Dock>
            </div>
          </div>
        )}
      </>
    );
  }
);

Navbar09.displayName = 'Navbar09';

export { HamburgerIcon, Logo, NotificationMenu, UserMenu };
