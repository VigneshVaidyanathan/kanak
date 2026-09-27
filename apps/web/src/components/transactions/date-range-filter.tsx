'use client';

import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  type DateRange,
} from '@kanak/ui';
import { IconCalendar, IconChevronDown } from '@tabler/icons-react';
import { useState } from 'react';

export type TransactionDateRange = { from: Date; to: Date };

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const monthRange = (year: number, month: number): TransactionDateRange => ({
  from: new Date(year, month, 1),
  to: endOfDay(new Date(year, month + 1, 0)),
});

export const DATE_PRESETS = [
  {
    value: 'this-month',
    label: 'This month',
    range: () => {
      const n = new Date();
      return monthRange(n.getFullYear(), n.getMonth());
    },
  },
  {
    value: 'last-month',
    label: 'Last month',
    range: () => {
      const n = new Date();
      return monthRange(n.getFullYear(), n.getMonth() - 1);
    },
  },
  {
    value: 'last-3-months',
    label: 'Last 3 months',
    range: () => {
      const n = new Date();
      return {
        from: new Date(n.getFullYear(), n.getMonth() - 2, 1),
        to: monthRange(n.getFullYear(), n.getMonth()).to,
      };
    },
  },
  {
    value: 'this-quarter',
    label: 'This quarter',
    range: () => {
      const n = new Date();
      const q = Math.floor(n.getMonth() / 3) * 3;
      return {
        from: new Date(n.getFullYear(), q, 1),
        to: monthRange(n.getFullYear(), q + 2).to,
      };
    },
  },
  {
    value: 'last-quarter',
    label: 'Last quarter',
    range: () => {
      const n = new Date();
      const q = Math.floor(n.getMonth() / 3) * 3 - 3;
      return {
        from: new Date(n.getFullYear(), q, 1),
        to: monthRange(n.getFullYear(), q + 2).to,
      };
    },
  },
  {
    value: 'this-year',
    label: 'This year',
    range: () => {
      const n = new Date();
      return {
        from: new Date(n.getFullYear(), 0, 1),
        to: monthRange(n.getFullYear(), 11).to,
      };
    },
  },
  {
    value: 'last-year',
    label: 'Last year',
    range: () => {
      const y = new Date().getFullYear() - 1;
      return { from: new Date(y, 0, 1), to: monthRange(y, 11).to };
    },
  },
  {
    value: 'all-time',
    label: 'All time',
    range: () => ({
      from: new Date(2000, 0, 1),
      to: endOfDay(new Date(2100, 0, 1)),
    }),
  },
] as const;

export type DatePresetValue = (typeof DATE_PRESETS)[number]['value'];

export function getPresetRange(preset: DatePresetValue): TransactionDateRange {
  const match = DATE_PRESETS.find((p) => p.value === preset);
  return (match ?? DATE_PRESETS[0]).range();
}

function labelFor(value: TransactionDateRange): string {
  const preset = DATE_PRESETS.find((p) => {
    const r = p.range();
    return (
      r.from.getTime() === value.from.getTime() &&
      r.to.getTime() === value.to.getTime()
    );
  });
  if (preset) return preset.label;
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  return `${fmt(value.from)} – ${fmt(value.to)}`;
}

interface DateRangeFilterProps {
  value: TransactionDateRange;
  onChange: (range: TransactionDateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(value);

  const apply = (range: TransactionDateRange) => {
    onChange(range);
    setDraft(range);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value);
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <IconCalendar size={16} />
          {labelFor(value)}
          <IconChevronDown size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 flex" align="end">
        <div className="flex flex-col gap-1 p-2 border-r min-w-[150px]">
          {DATE_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => apply(preset.range())}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <div className="p-2">
          <Calendar
            mode="range"
            defaultMonth={value.from}
            selected={draft}
            onSelect={(range: DateRange | undefined) => {
              setDraft(range);
              if (range?.from && range?.to) {
                apply({ from: startOfDay(range.from), to: endOfDay(range.to) });
              }
            }}
            numberOfMonths={2}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
