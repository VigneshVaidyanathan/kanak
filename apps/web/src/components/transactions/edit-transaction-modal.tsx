'use client';

import { useAuthStore } from '@/store/auth-store';
import {
  FormDatePicker,
  FormInput,
  FormSelect,
  FormSwitch,
  FormTextarea,
} from '@kanak/components';
import {
  BankAccount,
  Category,
  Transaction,
  UpdateTransactionInput,
  updateTransactionSchema,
} from '@kanak/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  Label,
  Spinner,
} from '@kanak/ui';
import { IconX } from '@tabler/icons-react';
import { format } from 'date-fns';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { BankAccountCombobox } from './bank-account-combobox';
import { CategoryCombobox } from './category-combobox';

interface EditTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  categories: Category[];
  bankAccounts: BankAccount[];
  onSuccess: () => void;
}

type TransactionFormData = UpdateTransactionInput;

const transactionTypeOptions = [
  { label: 'Credit', value: 'credit' },
  { label: 'Debit', value: 'debit' },
];

export function EditTransactionModal({
  open,
  onOpenChange,
  transaction,
  categories,
  bankAccounts,
  onSuccess,
}: EditTransactionModalProps) {
  const { token } = useAuthStore();

  const form = useForm<TransactionFormData>({
    defaultValues: {
      date: undefined,
      accountingDate: undefined,
      description: '',
      amount: undefined,
      type: undefined,
      bankAccount: '',
      category: undefined,
      notes: undefined,
      isInternal: false,
    },
  });

  useEffect(() => {
    if (transaction && open) {
      // Ensure dates are properly parsed and valid
      let transactionDate: Date | undefined;
      if (transaction.date) {
        const date = new Date(transaction.date);
        transactionDate = isNaN(date.getTime()) ? undefined : date;
      }

      let accountingDateValue: Date | undefined;
      if ((transaction as any).accountingDate) {
        const date = new Date((transaction as any).accountingDate);
        accountingDateValue = isNaN(date.getTime()) ? transactionDate : date;
      } else {
        accountingDateValue = transactionDate;
      }

      form.reset({
        date: transactionDate,
        accountingDate: accountingDateValue,
        description: transaction.description || '',
        amount: transaction.amount ? Number(transaction.amount) : undefined,
        type: transaction.type as 'credit' | 'debit' | undefined,
        bankAccount: transaction.bankAccount || '',
        category: transaction.category || undefined,
        notes: transaction.notes || undefined,
        isInternal: transaction.isInternal || false,
      });
    } else if (!open) {
      // Reset form when modal closes
      form.reset({
        date: undefined,
        accountingDate: undefined,
        description: '',
        amount: undefined,
        type: undefined,
        bankAccount: '',
        category: undefined,
        notes: undefined,
        isInternal: false,
      });
    }
  }, [transaction, open, form]);

  const onSubmit = async (data: TransactionFormData) => {
    if (!transaction || !token) {
      return;
    }

    try {
      // Convert Date objects to ISO strings for JSON serialization
      const dataToSend = {
        ...data,
        date: data.date instanceof Date ? data.date.toISOString() : data.date,
        accountingDate:
          data.accountingDate instanceof Date
            ? data.accountingDate.toISOString()
            : data.accountingDate,
      };

      // Validate with zod schema
      const validatedData = updateTransactionSchema.parse(dataToSend);

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update transaction');
      }

      toast.success('Transaction updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      if (error.errors) {
        // Zod validation errors
        const errorMessages = error.errors
          .map((e: any) => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
        toast.error(`Validation error: ${errorMessages}`);
      } else {
        toast.error(error.message || 'Failed to update transaction');
      }
    }
  };

  if (!transaction) {
    return null;
  }

  const createdAt = transaction.createdAt
    ? format(new Date(transaction.createdAt), 'PPpp')
    : 'N/A';
  const updatedAt = transaction.updatedAt
    ? format(new Date(transaction.updatedAt), 'PPpp')
    : 'N/A';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              Edit Transaction
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
            Update the transaction details below. All fields are editable.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormDatePicker
                control={form.control}
                name="date"
                label="Transaction Date *"
                placeholder="Select transaction date"
              />
              <FormDatePicker
                control={form.control}
                name="accountingDate"
                label="Accounting Date *"
                placeholder="Select accounting date"
              />
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              The accounting date is used in reports, budget calculations, and
              other financial analyses.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <FormSelect
                control={form.control}
                name="type"
                label="Type *"
                placeholder="Select type"
                options={transactionTypeOptions}
              />

              <div className="space-y-2">
                <Label>Category</Label>
                <CategoryCombobox
                  categories={categories}
                  value={form.watch('category')}
                  onValueChange={(value) =>
                    form.setValue('category', value || undefined)
                  }
                  placeholder="Select category (optional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                control={form.control}
                name="amount"
                label="Amount *"
                placeholder="Enter amount"
                type="number"
                validate={(value) => {
                  if (value === undefined || value === null || value === '') {
                    return 'Amount is required';
                  }
                  const numValue = Number(value);
                  if (isNaN(numValue) || numValue <= 0) {
                    return 'Amount must be a positive number';
                  }
                  return true;
                }}
              />

              <div className="space-y-2">
                <Label>Bank Account *</Label>
                <BankAccountCombobox
                  bankAccounts={bankAccounts}
                  value={form.watch('bankAccount')}
                  onValueChange={(value) => {
                    form.setValue('bankAccount', value || '', {
                      shouldValidate: true,
                    });
                  }}
                  placeholder="Select bank account"
                />
                {form.formState.errors.bankAccount && (
                  <p className="text-xs text-red-500 -mt-1">
                    {form.formState.errors.bankAccount.message}
                  </p>
                )}
              </div>
            </div>

            <FormTextarea
              control={form.control}
              name="description"
              label="Description *"
              placeholder="Enter transaction description"
              rows={3}
            />

            <FormTextarea
              control={form.control}
              name="notes"
              label="Notes"
              placeholder="Enter notes (optional)"
              rows={2}
            />

            <FormSwitch
              control={form.control}
              name="isInternal"
              label="Exclude from Reports"
              description="When enabled, this transaction will be excluded from reports and calculations"
            />

            <div className="border-t pt-4 space-y-2">
              <div className="text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium">{createdAt}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Last Updated:</span>
                  <span className="font-medium">{updatedAt}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Spinner className="mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update Transaction'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
