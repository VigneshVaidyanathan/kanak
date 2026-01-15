'use client';

import { Input } from '@kanak/ui';
import { useCallback, useEffect, useState } from 'react';

interface WealthDateCellProps {
  lineItemId: string;
  date: Date;
  value: number;
  updatedAt: string | null;
  onChange: (value: number) => void;
}

export function WealthDateCell({
  value,
  updatedAt,
  onChange,
}: WealthDateCellProps) {
  // Format number in Indian currency format (e.g., 1234567 -> 12,34,567)
  const formatIndianCurrency = useCallback((num: number): string => {
    if (num === 0) return '0';
    const numStr = Math.floor(num).toString();
    const lastThree = numStr.slice(-3);
    const otherNumbers = numStr.slice(0, -3);
    if (otherNumbers !== '') {
      return (
        otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
      );
    }
    return lastThree;
  }, []);

  // Parse formatted string back to number
  const parseFormattedValue = useCallback((formattedValue: string): number => {
    // Remove all commas and parse
    const cleaned = formattedValue.replace(/,/g, '');
    const num = parseFloat(cleaned) || 0;
    return Math.floor(num); // Ensure integer
  }, []);

  const [localValue, setLocalValue] = useState<string>(
    formatIndianCurrency(value || 0)
  );
  const [isFocused, setIsFocused] = useState(false);

  // Update local value when prop value changes (e.g., when data loads from API)
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(formatIndianCurrency(value || 0));
    }
  }, [value, formatIndianCurrency, isFocused]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setLocalValue(inputValue);

      // Parse the value, defaulting to 0 if empty or invalid
      const numValue = parseFormattedValue(inputValue);
      onChange(numValue);
    },
    [onChange, parseFormattedValue]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Show raw number when focused for easier editing
    const numValue = parseFormattedValue(localValue);
    setLocalValue(numValue.toString());
  }, [localValue, parseFormattedValue]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Format the value on blur
    const numValue = parseFormattedValue(localValue);
    setLocalValue(formatIndianCurrency(numValue));
    onChange(numValue);
  }, [localValue, formatIndianCurrency, parseFormattedValue, onChange]);

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          ₹
        </span>
        <Input
          type="text"
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="h-8 text-sm pl-7"
          placeholder="0"
          inputMode="numeric"
        />
      </div>
      {/* {updatedAt && (
        <span className='text-xs text-muted-foreground'>
          {formatUpdatedAt(updatedAt)}
        </span> */}
      {/* )} */}
    </div>
  );
}
