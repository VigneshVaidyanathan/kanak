'use client';

import {
  Button,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@kanak/ui';
import { IconTrendingDown, IconTrendingUp } from '@tabler/icons-react';

interface WealthTotalRowProps {
  dates: Date[];
  getTotalWealth: (date: Date) => number;
  getTotalWealthChange: (date: Date, dateIndex: number) => number;
}

export function WealthTotalRow({
  dates,
  getTotalWealth,
  getTotalWealthChange,
}: WealthTotalRowProps) {
  if (dates.length === 0) return null;

  return (
    <div className="rounded-lg bg-primary/5">
      <div className="flex items-center gap-4 p-2">
        <div className="min-w-[300px] shrink-0 sticky left-0 z-10 flex items-center gap-2 border-r border-border">
          <span className="font-bold text-base">Total wealth</span>
        </div>
        <div className="flex items-center gap-4">
          {dates.map((date, dateIndex) => (
            <div
              key={date.toISOString()}
              className="w-[150px] shrink-0 flex items-center gap-2"
            >
              <span className="text-base font-bold">
                {getTotalWealth(date).toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>
              {(() => {
                const change = getTotalWealthChange(date, dateIndex);
                if (change === 0) return null;
                return (
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-transparent"
                      >
                        {change > 0 ? (
                          <IconTrendingUp
                            size={14}
                            className="text-green-600"
                          />
                        ) : (
                          <IconTrendingDown
                            size={14}
                            className="text-red-600"
                          />
                        )}
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-auto p-2">
                      <div className="text-sm">
                        <div className="font-medium">Change from previous</div>
                        <div
                          className={`text-xs font-semibold ${
                            change >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {change >= 0 ? '+' : ''}
                          {change.toLocaleString('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                );
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
