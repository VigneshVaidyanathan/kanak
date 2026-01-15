'use client';

import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kanak/ui';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCalendar,
} from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

interface MonthNavigationProps {
  onMonthChange?: (month: string) => void;
}

export function MonthNavigation({ onMonthChange }: MonthNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize month from URL (format: YYYY-MM)
  const selectedMonth = useMemo<string>(() => {
    const monthParam = searchParams.get('month');
    if (monthParam) return monthParam;
    // Default to current month
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}`;
  }, [searchParams]);

  // Parse selected month
  const [year, month] = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return [y, m];
  }, [selectedMonth]);

  // Format month display
  const monthDisplay = useMemo(() => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [year, month]);

  // Handle month navigation
  const handleMonthNavigation = useCallback(
    (direction: 'prev' | 'next') => {
      let newYear = year;
      let newMonth = month;

      if (direction === 'prev') {
        newMonth -= 1;
        if (newMonth < 1) {
          newMonth = 12;
          newYear -= 1;
        }
      } else {
        newMonth += 1;
        if (newMonth > 12) {
          newMonth = 1;
          newYear += 1;
        }
      }

      const newMonthStr = `${newYear}-${String(newMonth).padStart(2, '0')}`;
      const params = new URLSearchParams(searchParams.toString());
      params.set('month', newMonthStr);
      const newUrl = `/budget?${params.toString()}`;
      router.push(newUrl, { scroll: false });
      onMonthChange?.(newMonthStr);
    },
    [router, searchParams, year, month, onMonthChange]
  );

  // Handle month/year selection from dropdowns
  const handleMonthYearChange = useCallback(
    (newYear: number, newMonth: number) => {
      const newMonthStr = `${newYear}-${String(newMonth).padStart(2, '0')}`;
      const params = new URLSearchParams(searchParams.toString());
      params.set('month', newMonthStr);
      const newUrl = `/budget?${params.toString()}`;
      router.push(newUrl, { scroll: false });
      onMonthChange?.(newMonthStr);
    },
    [router, searchParams, onMonthChange]
  );

  // Generate month options
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const date = new Date(2000, i, 1);
      return {
        value: monthNum.toString(),
        label: date.toLocaleDateString('en-US', { month: 'long' }),
      };
    });
  }, []);

  // Generate year options (current year ± 10 years)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 21 }, (_, i) => {
      const year = currentYear - 10 + i;
      return {
        value: year.toString(),
        label: year.toString(),
      };
    });
  }, []);

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleMonthNavigation('prev')}
        className="flex items-center gap-2"
      >
        <IconArrowLeft size={16} />
        Previous Month
      </Button>

      <div className="flex items-center gap-2">
        <div className="text-base font-semibold text-foreground">
          {monthDisplay}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <IconCalendar size={16} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="center">
            <div className="flex items-center gap-3">
              <Select
                value={month.toString()}
                onValueChange={(value) =>
                  handleMonthYearChange(year, parseInt(value))
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={year.toString()}
                onValueChange={(value) =>
                  handleMonthYearChange(parseInt(value), month)
                }
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleMonthNavigation('next')}
        className="flex items-center gap-2"
      >
        Next Month
        <IconArrowRight size={16} />
      </Button>
    </div>
  );
}
