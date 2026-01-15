'use client';

import { useAuthStore } from '@/store/auth-store';
import { FormInput } from '@kanak/components';
import {
  CreateBankAccountInput,
  createBankAccountSchema,
  updateBankAccountSchema,
} from '@kanak/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Form,
  Spinner,
} from '@kanak/ui';
import { IconX } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

interface BankAccountFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccount?: {
    id: string;
    name: string;
    bankName: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
  };
  onSuccess: () => void;
}

type BankAccountFormData = CreateBankAccountInput;

export function BankAccountFormModal({
  open,
  onOpenChange,
  bankAccount,
  onSuccess,
}: BankAccountFormModalProps) {
  const { token } = useAuthStore();
  const isEditing = !!bankAccount;

  const form = useForm<BankAccountFormData>({
    defaultValues: {
      name: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branch: '',
    },
  });

  useEffect(() => {
    if (bankAccount) {
      form.reset({
        name: bankAccount.name,
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber || '',
        ifscCode: bankAccount.ifscCode || '',
        branch: bankAccount.branch || '',
      });
    } else {
      form.reset({
        name: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
      });
    }
  }, [bankAccount, open, form]);

  const onSubmit = async (data: BankAccountFormData) => {
    try {
      // Validate with zod schema
      const schema = isEditing
        ? updateBankAccountSchema
        : createBankAccountSchema;
      const validatedData = schema.parse(data);

      const url = bankAccount
        ? `/api/bank-accounts/${bankAccount.id}`
        : '/api/bank-accounts';
      const method = bankAccount ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save bank account');
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Error saving bank account:', error);
      if (error.errors) {
        // Zod validation errors
        const errorMessages = error.errors
          .map((e: any) => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
        alert(`Validation error: ${errorMessages}`);
      } else {
        alert(error.message || 'Failed to save bank account');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              {isEditing ? 'Edit Bank Account' : 'Add Bank Account'}
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
            {isEditing
              ? 'Update the bank account details below.'
              : 'Fill in the details to create a new bank account.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormInput
              control={form.control}
              name="name"
              label="Account Name"
              placeholder="e.g., Vignesh - Canara"
            />

            <FormInput
              control={form.control}
              name="bankName"
              label="Bank Name"
              placeholder="e.g., Canara Bank"
            />

            <FormInput
              control={form.control}
              name="accountNumber"
              label="Account Number"
              placeholder="Enter account number (optional)"
            />

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                control={form.control}
                name="ifscCode"
                label="IFSC Code"
                placeholder="Enter IFSC code (optional)"
              />

              <FormInput
                control={form.control}
                name="branch"
                label="Branch"
                placeholder="Enter branch (optional)"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Spinner className="mr-2" />
                    Saving...
                  </>
                ) : isEditing ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
