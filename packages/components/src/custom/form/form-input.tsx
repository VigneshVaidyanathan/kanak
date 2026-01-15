'use client';

import * as React from 'react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@kanak/ui';
import { Control, FieldPath, FieldValues } from 'react-hook-form';

interface FormInputProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  description?: string;
  type?: string;
  disabled?: boolean;
  validate?: (value: any) => boolean | string | Promise<boolean | string>;
  autoComplete?: string;
  className?: string;
}

export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  type = 'text',
  disabled,
  validate,
  autoComplete,
  className,
}: FormInputProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      rules={validate ? { validate } : undefined}
      render={({ field }: { field: any }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          {description && (
            <FormDescription className="text-xs -mt-1">
              {description}
            </FormDescription>
          )}
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete={autoComplete}
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
