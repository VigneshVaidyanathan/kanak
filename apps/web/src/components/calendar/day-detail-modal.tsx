'use client';

import { formatINR } from '@/lib/insights';
import { Icon, type IconName } from '@kanak/components';
import { Category, Transaction } from '@kanak/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  ScrollArea,
} from '@kanak/ui';
import { IconCalendarOff, IconChevronDown } from '@tabler/icons-react';
import { useState } from 'react';

interface DayDetailModalProps {
  /** Midnight of the day being shown, or null when the modal is closed. */
  date: number | null;
  onOpenChange: (open: boolean) => void;
  income: Transaction[];
  expense: Transaction[];
  categories: Map<string, Category>;
}

/**
 * Cash direction, credit-positive: a credit inside an expense category is a
 * refund, so it has to subtract from the day's spend rather than add to it.
 * The calendar badges sign the same way — without this the two disagreed.
 */
const signedAmount = (transaction: Transaction) =>
  transaction.type === 'credit' ? transaction.amount : -transaction.amount;

const signed = (value: number) =>
  `${value >= 0 ? '+' : '-'}${formatINR(Math.abs(value))}`;

const toneOf = (value: number) =>
  value >= 0 ? 'text-green-600' : 'text-red-600';

/**
 * A statement import has no clock, so a midnight timestamp means "no time
 * known" rather than 12:00 AM — showing it would be inventing precision.
 */
const timeOfDay = (timestamp: number): string | null => {
  const date = new Date(timestamp);
  if (date.getHours() === 0 && date.getMinutes() === 0) return null;
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const fullDate = (date: number) =>
  new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

// Fixed column widths, so the rows line up as a table across account groups.
const AMOUNT_COL = 'w-[96px]';
const CATEGORY_COL = 'w-[160px]';

/** The same chip the transactions table shows: tinted icon circle, then title. */
function CategoryCell({ category }: { category?: Category }) {
  if (!category) {
    return (
      <span
        className={`${CATEGORY_COL} flex-shrink-0 flex items-center gap-2 text-xs font-medium text-muted-foreground`}
      >
        <span className="h-6 w-6 flex-shrink-0 rounded-full bg-muted" />
        Uncategorised
      </span>
    );
  }

  const hex = /^#[0-9a-f]{6}$/i.test(category.color)
    ? category.color
    : undefined;

  return (
    <span
      className={`${CATEGORY_COL} flex-shrink-0 flex items-center gap-2 text-xs font-medium`}
    >
      <span
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
        style={hex ? { backgroundColor: `${hex}1a` } : undefined}
      >
        <Icon
          name={category.icon as IconName}
          size={14}
          style={{ color: category.color }}
        />
      </span>
      <span className="truncate">{category.title}</span>
    </span>
  );
}

/** One transaction: amount, category, description, and the rest on demand. */
function Row({
  transaction,
  categories,
}: {
  transaction: Transaction;
  categories: Map<string, Category>;
}) {
  const [expanded, setExpanded] = useState(false);
  const value = signedAmount(transaction);
  const category = transaction.category
    ? categories.get(transaction.category)
    : undefined;
  const time = timeOfDay(transaction.date);

  return (
    <li className="px-3 py-2">
      <div className="flex min-h-8 items-center gap-3">
        <span
          className={`${AMOUNT_COL} flex-shrink-0 font-mono text-sm font-semibold tabular-nums ${toneOf(
            value
          )}`}
        >
          {signed(value)}
        </span>

        <CategoryCell category={category} />

        <span className="flex-1 min-w-0 truncate text-xs font-medium">
          {transaction.reason || transaction.description}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0 text-muted-foreground"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide details' : 'Show details'}
        >
          <IconChevronDown
            size={16}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </Button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-1 pt-2 pb-1 pr-8">
          <span className="text-xs leading-snug text-muted-foreground break-all">
            {transaction.description}
          </span>
          {transaction.notes && (
            <span className="text-xs leading-snug italic text-muted-foreground">
              {transaction.notes}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {transaction.bankAccount}
            {time ? ` · ${time}` : ''}
          </span>
        </div>
      )}
    </li>
  );
}

/** One bank account's transactions, collapsible. */
function AccountGroup({
  account,
  rows,
  categories,
}: {
  account: string;
  rows: Transaction[];
  categories: Map<string, Category>;
}) {
  const [open, setOpen] = useState(true);
  const subtotal = rows.reduce((sum, row) => sum + signedAmount(row), 0);

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <IconChevronDown
            size={14}
            className={`flex-shrink-0 text-foreground/60 transition-transform ${
              open ? '' : '-rotate-90'
            }`}
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground truncate">
            {account}
          </span>
        </span>
        <span className="text-xs font-mono whitespace-nowrap text-foreground/70">
          {rows.length} ·{' '}
          <span className={toneOf(subtotal)}>{signed(subtotal)}</span>
        </span>
      </button>

      {open && (
        <ul className="divide-y divide-border/50">
          {rows.map((row) => (
            <Row key={row.id} transaction={row} categories={categories} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** One side of the day: the transactions grouped under their bank account. */
function Column({
  title,
  total,
  transactions,
  categories,
}: {
  title: string;
  /** Already signed, credit-positive. */
  total: number;
  transactions: Transaction[];
  categories: Map<string, Category>;
}) {
  const byAccount = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const account = transaction.bankAccount || 'Unknown account';
    const group = byAccount.get(account);
    if (group) group.push(transaction);
    else byAccount.set(account, [transaction]);
  }

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-baseline justify-between border-b pb-2 mb-3">
        <span className="text-sm font-semibold">{title}</span>
        <span className={`font-mono text-sm font-semibold ${toneOf(total)}`}>
          {signed(total)}
        </span>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No {title.toLowerCase()} on this day
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {Array.from(byAccount, ([account, rows]) => (
            <AccountGroup
              key={account}
              account={account}
              rows={rows}
              categories={categories}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DayDetailModal({
  date,
  onOpenChange,
  income,
  expense,
  categories,
}: DayDetailModalProps) {
  const incomeTotal = income.reduce((sum, t) => sum + signedAmount(t), 0);
  const expenseTotal = expense.reduce((sum, t) => sum + signedAmount(t), 0);
  const net = incomeTotal + expenseTotal;
  const count = income.length + expense.length;

  return (
    <Dialog open={date !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader className="pr-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>{date === null ? '' : fullDate(date)}</DialogTitle>
              <DialogDescription>
                {count === 0
                  ? 'Nothing recorded'
                  : `${count} transaction${count === 1 ? '' : 's'}`}
              </DialogDescription>
            </div>
            {count > 0 && (
              <div className="text-right flex-shrink-0">
                <div
                  className={`font-mono text-2xl font-bold tabular-nums leading-none ${toneOf(
                    net
                  )}`}
                >
                  {signed(net)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">net</div>
              </div>
            )}
          </div>
        </DialogHeader>

        {count === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
            <IconCalendarOff size={32} className="text-muted-foreground/60" />
            <p className="text-sm font-medium">Nothing on this day</p>
            <p className="text-xs text-muted-foreground">
              No money moved in or out of any account.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="grid grid-cols-2 gap-6">
              <Column
                title="Income"
                total={incomeTotal}
                transactions={income}
                categories={categories}
              />
              <Column
                title="Expense"
                total={expenseTotal}
                transactions={expense}
                categories={categories}
              />
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
