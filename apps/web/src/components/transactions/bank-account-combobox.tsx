'use client';

import { BankAccount } from '@kanak/shared';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@kanak/ui';
import { IconX } from '@tabler/icons-react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

interface BankAccountComboboxProps {
  bankAccounts: BankAccount[];
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function BankAccountCombobox({
  bankAccounts,
  value,
  onValueChange,
  placeholder = 'Select bank account...',
  disabled = false,
}: BankAccountComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedBankAccount = bankAccounts.find(
    (account) => account.name === value
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between min-w-[200px] h-auto py-1.5 px-2',
            !selectedBankAccount && 'text-muted-foreground'
          )}
        >
          {selectedBankAccount ? (
            <span className="truncate text-sm font-medium flex-1 text-left">
              {selectedBankAccount.name}
            </span>
          ) : (
            <span className="text-sm">{placeholder}</span>
          )}
          <div className="flex items-center gap-1 ml-2">
            {selectedBankAccount && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onValueChange(undefined);
                }}
                className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Clear bank account"
              >
                <IconX className="h-4 w-4 shrink-0" />
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search bank accounts..." />
          <CommandList>
            <CommandEmpty>No bank account found.</CommandEmpty>
            <CommandGroup>
              {bankAccounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={account.name}
                  onSelect={() => {
                    onValueChange(
                      account.name === value ? undefined : account.name
                    );
                    setOpen(false);
                  }}
                  className="py-2 px-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-medium text-sm truncate flex-1">
                      {account.name}
                    </span>
                    <Check
                      className={cn(
                        'ml-2 h-4 w-4 shrink-0',
                        value === account.name ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
