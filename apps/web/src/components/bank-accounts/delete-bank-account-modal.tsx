'use client';

import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import { BankAccount } from '@kanak/shared';
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
import { useMutation } from 'convex/react';
import { useState } from 'react';

interface DeleteBankAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccount: BankAccount | null;
}

export function DeleteBankAccountModal({
  open,
  onOpenChange,
  bankAccount,
}: DeleteBankAccountModalProps) {
  const deactivateBankAccount = useMutation(
    api.bankAccounts.deactivateBankAccount
  );
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!bankAccount) return;

    try {
      setLoading(true);
      await deactivateBankAccount({
        id: bankAccount.id as Id<'bank_accounts'>,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting bank account:', error);
      alert(error.message || 'Failed to delete bank account');
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
              Delete Bank Account
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
            Are you sure you want to delete this bank account? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {bankAccount && (
          <div className="py-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Account Name:
                  </span>
                  <p className="text-sm font-semibold">{bankAccount.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Bank Name:
                  </span>
                  <p className="text-sm font-semibold">
                    {bankAccount.bankName}
                  </p>
                </div>
                {bankAccount.accountNumber && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Account Number:
                    </span>
                    <p className="text-sm font-semibold">
                      {bankAccount.accountNumber}
                    </p>
                  </div>
                )}
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
