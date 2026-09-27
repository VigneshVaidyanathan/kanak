'use client';

import { api } from '@kanak/convex/src/_generated/api';
import { BankAccount } from '@kanak/shared';
import { Button, Spinner } from '@kanak/ui';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useQuery } from 'convex/react';
import { useState } from 'react';
import { BankAccountFormModal } from './bank-account-form-modal';
import { DeleteBankAccountModal } from './delete-bank-account-modal';

export function BankAccountsSection() {
  // Live query: writes from the modals below land here on their own, so there
  // is nothing to refetch and no duplicate-call guard to keep.
  const bankAccounts = useQuery(api.bankAccounts.getBankAccountsByUserId, {});
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] =
    useState<BankAccount | null>(null);

  const loading = bankAccounts === undefined;

  const handleAdd = () => {
    setSelectedBankAccount(null);
    setFormModalOpen(true);
  };

  const handleEdit = (bankAccount: BankAccount) => {
    setSelectedBankAccount(bankAccount);
    setFormModalOpen(true);
  };

  const handleDelete = (bankAccount: BankAccount) => {
    setSelectedBankAccount(bankAccount);
    setDeleteModalOpen(true);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-1">Bank Accounts</h3>
          <p className="text-sm text-muted-foreground">
            Manage your bank accounts here. Bank accounts will be displayed here
            once defaults are configured.
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Bank Accounts</h3>
            <p className="text-sm text-muted-foreground">
              Manage your bank accounts here. Bank accounts will be displayed
              here once defaults are configured.
            </p>
          </div>
          <Button onClick={handleAdd} size="sm">
            <IconPlus className="h-4 w-4 mr-2" />
            Add Bank Account
          </Button>
        </div>

        {(bankAccounts ?? []).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-4">
              No bank accounts yet. Create your first bank account to get
              started.
            </p>
            <Button onClick={handleAdd} variant="outline">
              <IconPlus className="h-4 w-4 mr-2" />
              Add Bank Account
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(bankAccounts ?? []).map((bankAccount) => (
              <div
                key={bankAccount.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">
                      {bankAccount.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {bankAccount.bankName}
                    </p>
                    {(bankAccount.accountNumber ||
                      bankAccount.ifscCode ||
                      bankAccount.branch) && (
                      <div className="mt-3 space-y-1">
                        {bankAccount.accountNumber && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Account:</span>{' '}
                            {bankAccount.accountNumber}
                          </p>
                        )}
                        {bankAccount.ifscCode && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">IFSC:</span>{' '}
                            {bankAccount.ifscCode}
                          </p>
                        )}
                        {bankAccount.branch && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Branch:</span>{' '}
                            {bankAccount.branch}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleEdit(bankAccount)}
                      className="h-7 w-7"
                    >
                      <IconEdit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(bankAccount)}
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BankAccountFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        bankAccount={selectedBankAccount || undefined}
      />

      <DeleteBankAccountModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        bankAccount={selectedBankAccount}
      />
    </>
  );
}
