'use client';

import {
  Button,
  Calendar,
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
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';

interface FormDatePickerProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  disabled?: boolean;
  placeholder?: string;
  captionLayout?: 'label' | 'dropdown' | 'dropdown-months' | 'dropdown-years';
}

export function FormDatePicker<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  placeholder = 'Pick a date',
  captionLayout = 'dropdown',
}: FormDatePickerProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }: { field: any }) => {
        const [open, setOpen] = React.useState<boolean>(false);

        return (
          <FormItem className="flex flex-col">
            <FormLabel>{label}</FormLabel>
            {description && (
              <FormDescription className="text-xs -mt-1">
                {description}
              </FormDescription>
            )}
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger>
                <FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    data-empty={!field.value}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !field.value && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon />
                    {field.value ? (
                      format(
                        field.value instanceof Date
                          ? field.value
                          : new Date(field.value),
                        'PPP'
                      )
                    ) : (
                      <span>{placeholder}</span>
                    )}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    field.value
                      ? field.value instanceof Date
                        ? field.value
                        : new Date(field.value)
                      : undefined
                  }
                  onSelect={(date: Date | undefined) => {
                    field.onChange(date);
                    setOpen(false);
                  }}
                  captionLayout={captionLayout}
                  disabled={disabled}
                />
              </PopoverContent>
            </Popover>
            <FormMessage className="text-xs text-red-500" />
          </FormItem>
        );
      }}
    />
  );
}
