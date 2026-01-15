'use client';

import * as React from 'react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Textarea,
} from '@kanak/ui';
import { Control, FieldPath, FieldValues } from 'react-hook-form';

interface FormTextareaProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  validate?: (value: any) => boolean | string | Promise<boolean | string>;
  rows?: number;
}

export function FormTextarea<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  disabled,
  validate,
  rows = 4,
}: FormTextareaProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      rules={validate ? { validate } : undefined}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          {description && (
            <FormDescription className="text-xs -mt-1">
              {description}
            </FormDescription>
          )}
          <FormControl>
            <Textarea
              placeholder={placeholder}
              disabled={disabled}
              rows={rows}
              {...field}
              className="font-medium"
            />
          </FormControl>
          <FormMessage className="text-xs text-red-500 -mt-1" />
        </FormItem>
      )}
    />
  );
}
