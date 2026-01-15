'use client';

import {
  IconCalculator,
  IconCalendar,
  IconCreditCard,
  IconMoodSmile,
  IconSettings,
  IconUser,
} from '@tabler/icons-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@kanak/ui';
import * as React from 'react';

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  // Use controlled open state if provided, otherwise use internal state
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isOpen, setOpen]);

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={setOpen}
      showCloseButton={false}
      title="Global Search"
      description="Search for commands and actions"
    >
      <CommandInput placeholder="Type to search transactions..." />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem className="px-2 !py-1.5 h-auto">
            <IconCalendar />
            <span>Calendar</span>
          </CommandItem>
          <CommandItem className="px-2 !py-1.5 h-auto">
            <IconMoodSmile />
            <span>Search Emoji</span>
          </CommandItem>
          <CommandItem className="px-2 !py-1.5 h-auto">
            <IconCalculator />
            <span>Calculator</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem className="px-2 !py-1.5 h-auto">
            <IconUser />
            <span>Profile</span>
          </CommandItem>
          <CommandItem className="px-2 !py-1.5 h-auto">
            <IconCreditCard />
            <span>Billing</span>
          </CommandItem>
          <CommandItem className="px-2 !py-1.5 h-auto">
            <IconSettings />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
