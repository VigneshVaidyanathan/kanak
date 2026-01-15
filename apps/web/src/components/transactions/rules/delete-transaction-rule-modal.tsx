'use client';

import { useAuthStore } from '@/store/auth-store';
import { TransactionRule } from '@kanak/shared';
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

interface DeleteTransactionRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: TransactionRule | null;
  onSuccess: () => void;
}

export function DeleteTransactionRuleModal({
  open,
  onOpenChange,
  rule,
  onSuccess,
}: DeleteTransactionRuleModalProps) {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!rule) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/transaction-rules/${rule.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete transaction rule');
      }

      toast.success('Transaction rule deleted successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting transaction rule:', error);
      toast.error(error.message || 'Failed to delete transaction rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              Delete Transaction Rule
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
            Are you sure you want to delete this transaction rule? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {rule && (
          <div className="py-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Rule Title:
                  </span>
                  <p className="text-sm font-semibold">{rule.title}</p>
                </div>
              </div>
            </div>
          </div>
        )}

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
