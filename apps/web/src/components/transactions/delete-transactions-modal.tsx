'use client';

import { useAuthStore } from '@/store/auth-store';
import { Transaction } from '@kanak/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Spinner,
} from '@kanak/ui';
import { IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DeleteTransactionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
  onSuccess: () => void;
}

export function DeleteTransactionsModal({
  open,
  onOpenChange,
  transactions,
  onSuccess,
}: DeleteTransactionsModalProps) {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (transactions.length === 0 || !token) return;

    try {
      setLoading(true);
      const response = await fetch('/api/transactions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ids: transactions.map((t) => t.id),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete transactions');
      }

      const result = await response.json();
      toast.success(
        `Successfully deleted ${result.deletedCount} transaction(s)`
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting transactions:', error);
      toast.error(error.message || 'Failed to delete transactions');
    } finally {
      setLoading(false);
    }
  };

  const transactionCount = transactions.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-destructive">
              Delete Transactions
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6"
              disabled={loading}
            >
              <IconX size={16} />
            </Button>
          </div>
          <DialogDescription>
            Are you sure you want to delete {transactionCount} transaction
            {transactionCount !== 1 ? 's' : ''}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted rounded-lg p-4">
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Number of transactions:
                </span>
                <p className="text-sm font-semibold">{transactionCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner className="mr-2" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
