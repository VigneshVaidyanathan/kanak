'use client';

import { useAuthStore } from '@/store/auth-store';
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@kanak/ui';
import { IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface CopyBudgetsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceYear: number;
  sourceMonth: number;
  onSuccess: () => void;
}

export function CopyBudgetsModal({
  open,
  onOpenChange,
  sourceYear,
  sourceMonth,
  onSuccess,
}: CopyBudgetsModalProps) {
  const { token } = useAuthStore();
  const [targetYear, setTargetYear] = useState<number>(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Default to next month
    if (sourceMonth === 12) {
      return currentYear + 1;
    }
    return currentYear;
  });

  const [targetMonth, setTargetMonth] = useState<number>(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    // Default to next month
    if (sourceMonth === 12) {
      return 1;
    }
    return sourceMonth + 1;
  });

  const [isCopying, setIsCopying] = useState(false);
  const [hasExistingBudgets, setHasExistingBudgets] = useState(false);
  const [isCheckingBudgets, setIsCheckingBudgets] = useState(false);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);

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

  // Generate year options (past 5 years, current year, and future 5 years)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => {
      const year = currentYear - 5 + i;
      return {
        value: year.toString(),
        label: year.toString(),
      };
    });
  }, []);

  // Check if target month is in the past
  const isPastMonth = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (targetYear < currentYear) {
      return true;
    }
    if (targetYear === currentYear && targetMonth < currentMonth) {
      return true;
    }
    return false;
  }, [targetYear, targetMonth]);

  // Check if target month already has budgets
  useEffect(() => {
    const checkExistingBudgets = async () => {
      if (!token || !open) return;

      setIsCheckingBudgets(true);
      try {
        const response = await fetch(
          `/api/budgets?year=${targetYear}&month=${targetMonth}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const budgets = await response.json();
          const hasBudgets = budgets.length > 0;
          setHasExistingBudgets(hasBudgets);
          setShowOverwriteWarning(hasBudgets && isPastMonth);
        }
      } catch (error) {
        console.error('Error checking existing budgets:', error);
      } finally {
        setIsCheckingBudgets(false);
      }
    };

    checkExistingBudgets();
  }, [token, targetYear, targetMonth, open, isPastMonth]);

  // Format source month display
  const sourceMonthDisplay = useMemo(() => {
    const date = new Date(sourceYear, sourceMonth - 1);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [sourceYear, sourceMonth]);

  // Format target month display
  const targetMonthDisplay = useMemo(() => {
    const date = new Date(targetYear, targetMonth - 1);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [targetYear, targetMonth]);

  const handleCopy = useCallback(async () => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    // If overwriting past month budgets, show warning first
    if (hasExistingBudgets && isPastMonth && !showOverwriteWarning) {
      setShowOverwriteWarning(true);
      return;
    }

    setIsCopying(true);
    try {
      // Fetch current month's budgets
      const response = await fetch(
        `/api/budgets?year=${sourceYear}&month=${sourceMonth}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch budgets');
      }

      const budgets = await response.json();

      // Filter non-zero budgets
      const nonZeroBudgets = budgets.filter((budget: any) => budget.amount > 0);

      if (nonZeroBudgets.length === 0) {
        toast.info('No budgets to copy');
        onOpenChange(false);
        return;
      }

      // Copy each budget to target month
      const copyPromises = nonZeroBudgets.map((budget: any) =>
        fetch('/api/budgets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            categoryId: budget.categoryId,
            month: targetMonth,
            year: targetYear,
            amount: budget.amount,
            note: budget.note || '',
          }),
        })
      );

      const results = await Promise.all(copyPromises);
      const failed = results.filter((r: Response) => !r.ok);

      if (failed.length > 0) {
        throw new Error('Some budgets failed to copy');
      }

      toast.success(
        `Successfully copied ${nonZeroBudgets.length} budget${
          nonZeroBudgets.length > 1 ? 's' : ''
        } to ${targetMonthDisplay}`
      );

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error copying budgets:', error);
      toast.error(error.message || 'Failed to copy budgets');
    } finally {
      setIsCopying(false);
    }
  }, [
    token,
    sourceYear,
    sourceMonth,
    targetYear,
    targetMonth,
    targetMonthDisplay,
    hasExistingBudgets,
    isPastMonth,
    showOverwriteWarning,
    onOpenChange,
    onSuccess,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              Copy Budgets
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6"
            >
              <IconX size={16} />
            </Button>
          </div>
          <DialogDescription>
            All selected budgets for {sourceMonthDisplay} will be copied over to
            the new month that you are choosing.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Month</label>
            <div className="flex items-center gap-3">
              <Select
                value={monthOptions[targetMonth - 1]?.value}
                onValueChange={(value) => {
                  setTargetMonth(parseInt(value));
                  setShowOverwriteWarning(false);
                }}
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
                value={targetYear.toString()}
                onValueChange={(value) => {
                  setTargetYear(parseInt(value));
                  setShowOverwriteWarning(false);
                }}
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
            {isCheckingBudgets && (
              <p className="text-xs text-muted-foreground">Checking...</p>
            )}
          </div>

          {showOverwriteWarning && hasExistingBudgets && isPastMonth && (
            <Alert variant="destructive">
              <div className="space-y-1">
                <div className="font-semibold text-sm">
                  Warning: Overwriting Existing Budgets
                </div>
                <div className="text-sm">
                  The selected month ({targetMonthDisplay}) already has budgets
                  set. Copying will overwrite these existing budgets. This
                  action cannot be undone.
                </div>
              </div>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCopying}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCopy}
            disabled={isCopying || isCheckingBudgets}
            variant={showOverwriteWarning ? 'destructive' : 'default'}
          >
            {isCopying ? (
              <>
                <Spinner className="mr-2" />
                Copying...
              </>
            ) : (
              'Copy Budgets'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
