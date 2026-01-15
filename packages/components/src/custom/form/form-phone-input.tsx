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

interface FormPhoneInputProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  validate?: (value: any) => boolean | string | Promise<boolean | string>;
  defaultCountry?: string;
}

export function FormPhoneInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  disabled,
  validate,
  defaultCountry = 'US',
}: FormPhoneInputProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      rules={validate ? { validate } : undefined}
      render={({ field }: { field: any }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          {description && (
            <FormDescription className="text-xs -mt-1">
              {description}
            </FormDescription>
          )}
          <FormControl>
            <Input
              type="tel"
              placeholder={placeholder}
              disabled={disabled}
              value={field.value}
              onChange={field.onChange}
              className="font-medium"
            />
          </FormControl>
          <FormMessage className="text-xs text-red-500 -mt-1" />
        </FormItem>
      )}
    />
  );
}
