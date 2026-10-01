'use client';

import { formatINR, type Recurring } from '@/lib/insights';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kanak/ui';

interface RecurringTableProps {
  recurring: Recurring[];
  className?: string;
}

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });

/**
 * Charges that repeat. A table, not a chart: the useful act here is reading a
 * name and deciding whether to keep paying it, which no shape helps with.
 */
export function RecurringTable({ recurring, className }: RecurringTableProps) {
  const annualTotal = recurring
    .filter((item) => !item.stale)
    .reduce((sum, item) => sum + item.annual, 0);

  if (recurring.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Recurring Charges</CardTitle>
          <CardDescription>Steady amounts on a steady cadence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
            Nothing repeated often enough to call recurring
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Recurring Charges</CardTitle>
        <CardDescription>
          {formatINR(annualTotal)} a year across{' '}
          {recurring.filter((r) => !r.stale).length} active charges
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payee</TableHead>
              <TableHead>Every</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Per year</TableHead>
              <TableHead className="text-right">Last seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recurring.map((item) => (
              <TableRow
                key={item.label}
                className={item.stale ? 'opacity-60' : undefined}
              >
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {item.label}
                    {item.stale && (
                      <Badge variant="outline" className="text-xs font-normal">
                        stopped?
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.cadence}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatINR(item.amount)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatINR(item.annual)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatDate(item.lastDate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
