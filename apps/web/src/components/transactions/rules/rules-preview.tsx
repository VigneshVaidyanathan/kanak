'use client';

import { ChevronRight } from 'lucide-react';

export interface RuleBreakdownEntry {
  ruleTitle: string;
  count: number;
  transactionIds?: string[];
}

export interface PreviewResult {
  updated: number;
  skipped: number;
  ruleBreakdown: RuleBreakdownEntry[];
}

export interface PreviewRow {
  description?: string;
  date?: number;
  amount?: number;
  type?: 'credit' | 'debit';
}

/**
 * The "rules to be applied" list, shared by the bulk Apply Rules modal and the
 * last step of a CSV import. Each rule expands to the transactions it matched.
 */
export function RulesPreview({
  result,
  lookup,
}: {
  result: PreviewResult;
  lookup: (id: string) => PreviewRow | undefined;
}) {
  return (
    <div className="min-w-0 py-4 space-y-4">
      {result.ruleBreakdown.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Rules to be applied:</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto overflow-x-hidden px-1 -mx-1">
            {result.ruleBreakdown.map((rule, index) => (
              // ponytail: native <details>, no accordion component needed.
              <details
                key={index}
                className="rounded-md border bg-muted/50 group min-w-0"
              >
                <summary className="flex items-center justify-between p-3 cursor-pointer list-none">
                  <span className="text-sm font-medium flex items-center gap-2 min-w-0">
                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
                    <span className="truncate">{rule.ruleTitle}</span>
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {rule.count} transaction{rule.count !== 1 ? 's' : ''}
                  </span>
                </summary>
                <div className="border-t divide-y">
                  {(rule.transactionIds ?? []).map((id) => {
                    const row = lookup(id);
                    if (!row) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                      >
                        <span
                          className="truncate min-w-0"
                          title={row.description}
                        >
                          {row.description}
                        </span>
                        <span className="shrink-0 text-muted-foreground tabular-nums">
                          {row.date
                            ? `${new Date(row.date).toLocaleDateString('en-IN')} · `
                            : ''}
                          {row.type === 'debit' ? '-' : '+'}
                          {(row.amount ?? 0).toLocaleString('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-md border bg-muted/50 text-sm text-muted-foreground">
          No rules matched any of the selected transactions.
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t">
        <div className="space-y-1">
          <div className="text-sm font-medium">
            Total transactions to be updated:{' '}
            <span className="text-primary">{result.updated}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Total transactions skipped: <span>{result.skipped}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
