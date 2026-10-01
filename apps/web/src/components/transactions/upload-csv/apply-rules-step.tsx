'use client';

import {
  type PreviewResult,
  RulesPreview,
} from '@/components/transactions/rules/rules-preview';
import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import type { CreateTransactionInput } from '@kanak/shared';
import { Button, Spinner } from '@kanak/ui';
import { IconArrowRight, IconCheck } from '@tabler/icons-react';
import { useMutation } from 'convex/react';
import { useEffect, useState } from 'react';

/**
 * Last step of a CSV import: categorise what was just imported by running the
 * user's transaction rules over it, previewed before anything is written.
 */
export const ApplyRulesStep = ({
  transactionIds,
  rows,
  onFinish,
}: {
  transactionIds: Id<'transactions'>[];
  /** Imported rows in the same order as `transactionIds`, for the preview. */
  rows: CreateTransactionInput[];
  onFinish: () => void;
}) => {
  const applyRules = useMutation(api.transactions.applyRules);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    applyRules({ transactionIds, preview: true })
      .then((result) => {
        if (cancelled) return;
        setPreview({
          updated: result.updated,
          skipped: result.skipped,
          ruleBreakdown: Object.values(result.ruleBreakdown ?? {}),
        });
      })
      .catch((e: any) => {
        if (!cancelled) setError(e.message || 'Failed to check rules');
      });
    return () => {
      cancelled = true;
    };
  }, [applyRules, transactionIds]);

  const lookup = (id: string) => {
    const index = transactionIds.indexOf(id as Id<'transactions'>);
    const row = index === -1 ? undefined : rows[index];
    return row && { ...row, date: row.date.getTime() };
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const result = await applyRules({ transactionIds, preview: false });
      setApplied(result.updated);
    } catch (e: any) {
      setError(e.message || 'Failed to apply rules');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="p-3 pt-1">
      {error && <div className="text-sm text-red-500">{error}</div>}

      {applied !== null ? (
        <div className="w-full flex flex-col items-center justify-center p-3">
          <div className="mb-2 p-2 rounded-full bg-neutral-900">
            <IconCheck size={22} className="text-white" />
          </div>
          <div className="text-lg font-semibold">
            Rules applied to {applied} transactions.
          </div>
        </div>
      ) : !preview && !error ? (
        <div className="w-full flex flex-col items-center justify-center p-6 gap-2">
          <Spinner className="size-6" />
          <div className="text-sm text-gray-500">Checking rules...</div>
        </div>
      ) : (
        preview && <RulesPreview result={preview} lookup={lookup} />
      )}

      <div className="mt-10 flex justify-end gap-2">
        {applied === null && (
          <>
            <Button size="sm" variant="outline" onClick={onFinish}>
              Skip
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={applying || !preview || preview.updated === 0}
            >
              {applying ? (
                <>
                  <Spinner className="size-4" />
                  Applying...
                </>
              ) : (
                'Apply Rules'
              )}
            </Button>
          </>
        )}
        {applied !== null && (
          <Button size="sm" onClick={onFinish}>
            Finish
            <IconArrowRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
};
