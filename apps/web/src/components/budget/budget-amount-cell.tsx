'use client';

import { BudgetTrendCard } from '@/components/budget/budget-trend-card';
import { Button, HoverCardTrigger, Input } from '@kanak/ui';
import { IconTrendingUp } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';

interface BudgetAmountCellProps {
  categoryId: string;
  initialAmount: number;
  onAmountChange: (categoryId: string, amount: number) => void;
  currentYear: number;
  currentMonth: number;
}

export function BudgetAmountCell({
  categoryId,
  initialAmount,
  onAmountChange,
  currentYear,
  currentMonth,
}: BudgetAmountCellProps) {
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

  const [localAmount, setLocalAmount] = useState<string>(
    formatIndianCurrency(initialAmount || 0)
  );
  const [isFocused, setIsFocused] = useState(false);

  // Update local state when initial amount changes
  useEffect(() => {
    if (!isFocused) {
      setLocalAmount(formatIndianCurrency(initialAmount || 0));
    }
  }, [initialAmount, formatIndianCurrency, isFocused]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setLocalAmount(inputValue);

      // Parse the value and notify parent
      const numValue = parseFormattedValue(inputValue);
      onAmountChange(categoryId, numValue);
    },
    [categoryId, onAmountChange, parseFormattedValue]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Show raw number when focused for easier editing
    const numValue = parseFormattedValue(localAmount);
    setLocalAmount(numValue.toString());
  }, [localAmount, parseFormattedValue]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Ensure the value is a valid number on blur
    const numValue = parseFormattedValue(localAmount);
    if (isNaN(numValue) || numValue < 0) {
      setLocalAmount('0');
      onAmountChange(categoryId, 0);
    } else {
      setLocalAmount(formatIndianCurrency(numValue));
    }
  }, [
    localAmount,
    categoryId,
    onAmountChange,
    formatIndianCurrency,
    parseFormattedValue,
  ]);

  return (
    <BudgetTrendCard
      categoryId={categoryId}
      currentYear={currentYear}
      currentMonth={currentMonth}
    >
      <div className="relative w-full flex items-center gap-1">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            ₹
          </span>
          <Input
            type="text"
            value={localAmount}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="w-full text-right pl-8"
            placeholder="0"
            inputMode="numeric"
          />
        </div>
        <HoverCardTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 flex-shrink-0"
            type="button"
          >
            <IconTrendingUp size={16} className="text-muted-foreground" />
          </Button>
        </HoverCardTrigger>
      </div>
    </BudgetTrendCard>
  );
}
