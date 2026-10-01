'use client';

import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import { Transaction } from '@kanak/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
} from '@kanak/ui';
import { useMutation } from 'convex/react';
import { type PreviewResult, RulesPreview } from './rules-preview';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface ApplyRulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTransactions: Transaction[];
  onSuccess?: () => void;
}

export function ApplyRulesModal({
  open,
  onOpenChange,
  selectedTransactions,
  onSuccess,
}: ApplyRulesModalProps) {
  const applyRules = useMutation(api.transactions.applyRules);
  const transactionsById = useMemo(
    () => new Map(selectedTransactions.map((t) => [t.id, t])),
    [selectedTransactions]
  );
  const [loading, setLoading] = useState(false);
  const [checkingRules, setCheckingRules] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(
    null
  );
  const [step, setStep] = useState<'initial' | 'preview' | 'applying'>(
    'initial'
  );

  const handleCheckRules = async () => {
    if (selectedTransactions.length === 0) {
      toast.error('No transactions selected');
      return;
    }

    setCheckingRules(true);

    try {
      const result = await applyRules({
        transactionIds: selectedTransactions.map(
          (t) => t.id as Id<'transactions'>
        ),
        preview: true,
      });

      setPreviewResult({
        updated: result.updated,
        skipped: result.skipped,
        // The mutation keys its breakdown by rule id; the list just needs values.
        ruleBreakdown: Object.values(result.ruleBreakdown ?? {}),
      });
      setStep('preview');
    } catch (error: any) {
      console.error('Error checking rules:', error);
      toast.error(error.message || 'Failed to check rules');
    } finally {
      setCheckingRules(false);
    }
  };

  const handleApplyRules = async () => {
    setStep('applying');
    setLoading(true);

    try {
      const result = await applyRules({
        transactionIds: selectedTransactions.map(
          (t) => t.id as Id<'transactions'>
        ),
        preview: false,
      });

      toast.success(
        `Rules applied successfully! Updated ${result.updated} transaction(s), skipped ${result.skipped} transaction(s).`
      );
      onSuccess?.();
      onOpenChange(false);
      // Reset state for next time
      setStep('initial');
      setPreviewResult(null);
    } catch (error: any) {
      console.error('Error applying rules:', error);
      toast.error(error.message || 'Failed to apply rules');
      setStep('preview'); // Go back to preview step on error
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (step === 'applying') {
      return; // Prevent closing while applying
    }
    setStep('initial');
    setPreviewResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Apply Rules to Transactions</DialogTitle>
          <DialogDescription>
            {step === 'initial' && (
              <>
                Click &quot;Check Rules&quot; to preview which rules will be
                applied to <strong>{selectedTransactions.length}</strong>{' '}
                transaction(s).
              </>
            )}
            {step === 'preview' && previewResult && (
              <>
                Review the rules that will be applied. Click &quot;Apply
                Rules&quot; to save the changes.
              </>
            )}
            {step === 'applying' && (
              <>Applying rules to transactions. Please wait...</>
            )}
          </DialogDescription>
        </DialogHeader>

        {step === 'initial' && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will evaluate each transaction against your rules and show
              you a preview of which rules will be applied before making any
              changes.
            </p>
          </div>
        )}

        {step === 'preview' && previewResult && (
          <RulesPreview
            result={previewResult}
            lookup={(id) => transactionsById.get(id)}
          />
        )}

        {step === 'applying' && (
          <div className="py-8 flex flex-col items-center justify-center">
            <Spinner className="mb-4 h-8 w-8" />
            <p className="text-sm text-muted-foreground">
              Applying rules to {selectedTransactions.length} transaction(s)...
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'initial' && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={checkingRules}
              >
                Cancel
              </Button>
              <Button onClick={handleCheckRules} disabled={checkingRules}>
                {checkingRules ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Checking...
                  </>
                ) : (
                  'Check Rules'
                )}
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('initial')}>
                Back
              </Button>
              <Button onClick={handleApplyRules} disabled={loading}>
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Applying...
                  </>
                ) : (
                  'Apply Rules'
                )}
              </Button>
            </>
          )}

          {step === 'applying' && (
            <Button disabled>
              <Spinner className="mr-2 h-4 w-4" />
              Applying Rules...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
