'use client';

import * as React from 'react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Switch,
} from '@kanak/ui';
import { Control, FieldPath, FieldValues } from 'react-hook-form';

interface FormSwitchProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function FormSwitch<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  onCheckedChange,
}: FormSwitchProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col rounded-lg border p-3">
          <div className="flex flex-row items-center gap-2">
            <div className="space-y-0.5 flex-1">
              <FormLabel>{label}</FormLabel>
              {description && (
                <FormDescription className="text-xs">
                  {description}
                </FormDescription>
              )}
            </div>
            <FormControl>
              <Switch
                checked={
                  typeof field.value === 'string'
                    ? field.value === 'true'
                    : Boolean(field.value)
                }
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  onCheckedChange?.(checked);
                }}
                disabled={disabled}
              />
            </FormControl>
          </div>
          <FormMessage className="text-xs text-red-500" />
        </FormItem>
      )}
    />
  );
}
