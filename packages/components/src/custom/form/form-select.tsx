'use client';

import { X } from 'lucide-react';

import * as React from 'react';
import {
  Button,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@kanak/ui';
import { Control, FieldPath, FieldValues } from 'react-hook-form';

export interface SelectOption<D = any> {
  label: string;
  value: string;
  data?: D;
}

interface FormSelectProps<T extends FieldValues, D = any> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  description?: string;
  options: SelectOption<D>[];
  disabled?: boolean;
  renderItem?: (option: SelectOption<D>) => React.ReactNode;
  clearable?: boolean;
}

export function FormSelect<T extends FieldValues, D = any>({
  control,
  name,
  label,
  placeholder,
  description,
  options,
  disabled,
  renderItem,
  clearable = false,
}: FormSelectProps<T, D>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const hasValue = field.value && field.value !== '';

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            {description && (
              <FormDescription className="text-xs -mt-1">
                {description}
              </FormDescription>
            )}
            <FormControl>
              <div className="relative">
                <Select
                  onValueChange={(value) => {
                    if (value) {
                      field.onChange(value);
                    }
                  }}
                  value={field.value || ''}
                  disabled={disabled}
                >
                  <SelectTrigger className="font-medium w-full">
                    <SelectValue placeholder={placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {renderItem ? renderItem(option) : option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clearable && hasValue && (
                  <Tooltip>
                    <TooltipContent>Clear selection</TooltipContent>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          field.onChange(undefined);
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-auto w-auto p-1 opacity-70 hover:opacity-100"
                        aria-label="Clear selection"
                        disabled={disabled}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                  </Tooltip>
                )}
              </div>
            </FormControl>
            <FormMessage className="text-xs text-red-500 -mt-1" />
          </FormItem>
        );
      }}
    />
  );
}
