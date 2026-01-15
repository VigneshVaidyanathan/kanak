'use client';

import { useAuthStore } from '@/store/auth-store';
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
import { useState } from 'react';
import { toast } from 'sonner';

interface ApplyRulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTransactions: Transaction[];
  onSuccess?: () => void;
}

interface PreviewResult {
  updated: number;
  skipped: number;
  ruleBreakdown: Array<{ ruleTitle: string; count: number }>;
}

export function ApplyRulesModal({
  open,
  onOpenChange,
  selectedTransactions,
  onSuccess,
}: ApplyRulesModalProps) {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [checkingRules, setCheckingRules] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(
    null
  );
  const [step, setStep] = useState<'initial' | 'preview' | 'applying'>(
    'initial'
  );

  const handleCheckRules = async () => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    if (selectedTransactions.length === 0) {
      toast.error('No transactions selected');
      return;
    }

    setCheckingRules(true);

    try {
      const response = await fetch('/api/transactions/apply-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionIds: selectedTransactions.map((t) => t.id),
          preview: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to check rules');
      }

      const result = await response.json();

      if (result.success) {
        setPreviewResult({
          updated: result.updated,
          skipped: result.skipped,
          ruleBreakdown: result.ruleBreakdown || [],
        });
        setStep('preview');
      } else {
        throw new Error(result.error || 'Failed to check rules');
      }
    } catch (error: any) {
      console.error('Error checking rules:', error);
      toast.error(error.message || 'Failed to check rules');
    } finally {
      setCheckingRules(false);
    }
  };

  const handleApplyRules = async () => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    setStep('applying');
    setLoading(true);

    try {
      const response = await fetch('/api/transactions/apply-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionIds: selectedTransactions.map((t) => t.id),
          preview: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to apply rules');
      }

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Rules applied successfully! Updated ${result.updated} transaction(s), skipped ${result.skipped} transaction(s).`
        );
        if (result.errors && result.errors.length > 0) {
          console.error('Some transactions failed to update:', result.errors);
        }
        onSuccess?.();
        onOpenChange(false);
        // Reset state for next time
        setStep('initial');
        setPreviewResult(null);
      } else {
        throw new Error(result.error || 'Failed to apply rules');
      }
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
      <DialogContent className="max-w-2xl">
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
          <div className="py-4 space-y-4">
            {previewResult.ruleBreakdown.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Rules to be applied:</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {previewResult.ruleBreakdown.map((rule, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-md border bg-muted/50"
                    >
                      <span className="text-sm font-medium">
                        {rule.ruleTitle}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {rule.count} transaction{rule.count !== 1 ? 's' : ''}
                      </span>
                    </div>
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
                  <span className="text-primary">{previewResult.updated}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Total transactions skipped:{' '}
                  <span>{previewResult.skipped}</span>
                </div>
              </div>
            </div>
          </div>
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
