'use client';

import {
  Badge,
  Button,
  Checkbox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@kanak/ui';
import { IconChevronDown, IconX } from '@tabler/icons-react';

export interface FilterOption {
  value: string;
  label: string;
  /** Rendered before the label — a category icon, say. */
  adornment?: React.ReactNode;
}

interface FilterSelectProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** Hide the search box for short lists. */
  searchable?: boolean;
}

/**
 * ponytail: a plain multi-select, not the data-table's combobox — that one is
 * bound to a TanStack column and there is no table here.
 */
export function FilterSelect({
  label,
  options,
  selected,
  onChange,
  searchable = true,
}: FilterSelectProps) {
  const toggle = (value: string) =>
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {selected.length}
            </Badge>
          )}
          <IconChevronDown size={14} className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          {searchable && (
            <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
          )}
          <CommandList>
            <CommandEmpty>No match</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => toggle(option.value)}
                  className="gap-2"
                >
                  <Checkbox
                    checked={selected.includes(option.value)}
                    className="pointer-events-none"
                  />
                  {option.adornment}
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {selected.length > 0 && (
          <div className="border-t p-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => onChange([])}
            >
              <IconX size={14} />
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
