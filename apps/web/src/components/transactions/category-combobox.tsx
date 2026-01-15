'use client';

import { Icon } from '@kanak/components';
import { Category } from '@kanak/shared';
import {
  Badge,
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

// Helper function to convert hex to rgba with opacity
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const typeLabels: Record<string, string> = {
  income: 'Income',
  expense: 'Expense',
  'intra-transfer': 'Intra Transfer',
  'passive-savings': 'Passive Savings',
  savings: 'Savings',
};

const typeColors: Record<string, string> = {
  income: 'bg-green-500/10 text-green-600',
  expense: 'bg-red-500/10 text-red-600',
  'intra-transfer': 'bg-blue-500/10 text-blue-600',
  'passive-savings': 'bg-purple-500/10 text-purple-600',
  savings: 'bg-teal-500/10 text-teal-600',
};

interface CategoryComboboxProps {
  categories: Category[];
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CategoryCombobox({
  categories,
  value,
  onValueChange,
  placeholder = 'Select category...',
  disabled = false,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedCategory = categories.find((cat) => cat.title === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between h-auto py-1.5 px-2',
            !selectedCategory && 'text-muted-foreground'
          )}
        >
          {selectedCategory ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: hexToRgba(selectedCategory.color, 0.1),
                }}
              >
                <Icon
                  name={selectedCategory.icon as any}
                  size={14}
                  style={{ color: selectedCategory.color }}
                />
              </div>
              <span className="truncate text-xs font-medium">
                {selectedCategory.title}
              </span>
            </div>
          ) : (
            <span className="text-sm">{placeholder}</span>
          )}
          <div className="flex items-center gap-1 ml-2">
            {selectedCategory && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onValueChange(undefined);
                }}
                className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Clear category"
              >
                <IconX className="h-4 w-4 shrink-0" />
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              {categories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.title}
                  onSelect={() => {
                    onValueChange(
                      category.title === value ? undefined : category.title
                    );
                    setOpen(false);
                  }}
                  className="py-2 px-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: hexToRgba(category.color, 0.1),
                      }}
                    >
                      <Icon
                        name={category.icon as any}
                        size={16}
                        style={{ color: category.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {category.title}
                        </span>
                        <Badge
                          className={cn(
                            'text-xs shrink-0',
                            typeColors[category.type] ||
                              'bg-gray-500/10 text-gray-600'
                          )}
                        >
                          {typeLabels[category.type] || category.type}
                        </Badge>
                      </div>
                      {category.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <Check
                      className={cn(
                        'ml-2 h-4 w-4 shrink-0',
                        value === category.title ? 'opacity-100' : 'opacity-0'
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
