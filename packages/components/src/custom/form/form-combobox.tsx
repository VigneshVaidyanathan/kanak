'use client';

import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@kanak/ui';
import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';

export interface ComboboxGroup {
  label: string;
  options: {
    label: string;
    value: string;
  }[];
}

interface FormComboboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  description?: string;
  placeholder?: string;
  groups: ComboboxGroup[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  popoverContentClassname?: string;
}

export function FormCombobox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  placeholder = 'Select an option...',
  groups,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No option found.',
  popoverContentClassname,
}: FormComboboxProps<TFieldValues, TName>) {
  const [open, setOpen] = React.useState(false);

  // Flatten all options for searching
  const allOptions = groups.flatMap((group) => group.options);

  const getSelectedLabel = (value: string) => {
    const option = allOptions.find((opt) => opt.value === value);
    return option?.label || placeholder;
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }: { field: any }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          {description && (
            <FormDescription className="text-xs">{description}</FormDescription>
          )}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    'w-full justify-between',
                    !field.value && 'text-muted-foreground'
                  )}
                >
                  {field.value ? getSelectedLabel(field.value) : placeholder}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent
              className={cn('w-[400px] p-0', popoverContentClassname)}
            >
              <Command>
                <CommandInput placeholder={searchPlaceholder} />
                <CommandList>
                  <CommandEmpty>{emptyMessage}</CommandEmpty>
                  {groups.map((group) => (
                    <CommandGroup key={group.label} heading={group.label}>
                      {group.options.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={(currentValue: string) => {
                            field.onChange(
                              currentValue === field.value ? '' : currentValue
                            );
                            setOpen(false);
                          }}
                        >
                          {option.label}
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              field.value === option.value
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
