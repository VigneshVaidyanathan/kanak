'use client';

import { parseDateByFormat } from '@/lib/date-parser';
import { useAuthStore } from '@/store/auth-store';
import {
  type SampleTransaction,
  useCsvUploadStore,
} from '@/store/csv-upload-store';
import { useTransactionsStore } from '@/store/transactions-store';
import { DataTable, DataTableColumnHeader } from '@kanak/components';
import { bulkTransactionsSchema, createTransactionSchema } from '@kanak/shared';
import { Badge, Button, Spinner } from '@kanak/ui';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconCurrencyRupee,
} from '@tabler/icons-react';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

export const VerifyTransactions = ({
  transactions,
  onBack,
  onComplete,
}: {
  transactions: SampleTransaction[];
  onBack: () => void;
  onComplete: () => void;
}) => {
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionsAdded, setTransactionsAdded] = useState(0);
  const { token } = useAuthStore();
  const { setTransactions } = useTransactionsStore();
  const { dateFormat } = useCsvUploadStore();

  const columns = useMemo<ColumnDef<SampleTransaction>[]>(
    () => [
      {
        accessorKey: 'date',
        meta: {
          header: 'Date',
        },
        size: 120,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => {
          const dateStr = row.original.date;
          if (!dateStr) return '-';
          try {
            const date = parseDateByFormat(dateStr, dateFormat);
            return (
              <div className="text-sm">
                {date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            );
          } catch (error) {
            return <div className="text-sm text-red-500">{dateStr}</div>;
          }
        },
      },
      {
        accessorKey: 'amount',
        meta: {
          header: 'Amount',
        },
        size: 120,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Amount" />
        ),
        cell: ({ row }) => {
          const amount = row.original.amount;
          return (
            <div className="flex items-center">
              <IconCurrencyRupee size={14} />
              <div className="font-medium text-sm">{amount || '-'}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'type',
        meta: {
          header: 'Type',
        },
        size: 100,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => {
          const type = row.original.type;
          return (
            <div className="text-xs flex items-center gap-2">
              {type?.toLowerCase() === 'debit' && (
                <Badge variant="outline">Debit</Badge>
              )}
              {type?.toLowerCase() === 'credit' && (
                <Badge variant="default">Credit</Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'bankAccount',
        meta: {
          header: 'Account',
        },
        size: 130,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Account" />
        ),
        cell: ({ row }) => {
          return (
            <div className="flex items-center flex-wrap text-sm">
              <div>{row.original.bankAccount || '-'}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'description',
        meta: {
          header: 'Description',
          flex: true,
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Description" />
        ),
        cell: ({ row }) => {
          const description = row.original.description;
          return (
            <div className="text-xs text-gray-400 max-w-[300px] text-ellipsis wrap-break-word leading-[16px] max-h-[32px] overflow-hidden">
              <span>{description || '-'}</span>
            </div>
          );
        },
      },
    ],
    [dateFormat]
  );

  // Show all transactions
  const displayTransactions = useMemo(() => transactions, [transactions]);

  const handleAddTransactions = async () => {
    if (!transactions || transactions.length === 0) {
      console.error('No transactions available');
      return;
    }

    setIsLoading(true);

    try {
      // Validate each transaction with Zod schema
      // Parse dates using the selected format before validation
      const validatedTransactions = transactions
        .map((transaction) => {
          try {
            // Parse date using the selected format
            if (transaction.date) {
              const parsedDate = parseDateByFormat(
                transaction.date,
                dateFormat
              );
              // Convert to ISO string for the schema
              const transactionWithParsedDate = {
                ...transaction,
                date: parsedDate.toISOString(),
                accountingDate: parsedDate.toISOString(),
              };
              return createTransactionSchema.parse(transactionWithParsedDate);
            }
            return createTransactionSchema.parse(transaction);
          } catch (error) {
            console.error('Error validating transaction:', error, transaction);
            return null;
          }
        })
        .filter(
          (
            t: ReturnType<typeof createTransactionSchema.parse> | null
          ): t is ReturnType<typeof createTransactionSchema.parse> => t !== null
        );

      // Validate all transactions using bulk schema
      const bulkValidatedTransactions = bulkTransactionsSchema.parse(
        validatedTransactions
      );

      const response = await fetch('/api/transactions/upload/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transactions: bulkValidatedTransactions }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process CSV');
      }

      const result = await response.json();
      setTransactionsAdded(
        result.created || result.total || transactions.length
      );

      // Refresh transactions list
      const transactionsResponse = await fetch('/api/transactions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
      }

      setIsAdded(true);
    } catch (error) {
      console.error('Error adding transactions:', error);
      if (typeof window !== 'undefined') {
        window.alert('Failed to add transactions. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isAdded && !isLoading && (
        <div className="p-3 pt-1">
          <div className="mb-5 text-sm font-bold text-center">
            {transactions.length} transactions to import.
          </div>
          <div className="mb-5 text-sm">
            All {transactions.length} transaction(s) from the uploaded CSV file
            are shown here based on the mapping provided. Verify if the
            transactions are mapped properly and proceed to import all the
            transactions.
          </div>
          <div
            className="max-h-[540px] overflow-y-auto border rounded-md"
            style={{ minHeight: '540px' }}
          >
            <DataTable
              data={displayTransactions}
              columns={columns}
              isLoading={false}
              pagination={false}
              showRefresh={false}
              searchPlaceholder=""
            />
          </div>
        </div>
      )}

      {isLoading && (
        <div className="p-3 pt-1">
          <div className="w-full flex flex-col items-center justify-center p-3">
            <div className="mb-2 p-2 rounded-full bg-neutral-900">
              <Spinner className="text-white size-6" />
            </div>
            <div className="text-lg font-semibold">
              Adding {transactions.length} transactions...
            </div>
            <div className="text-sm text-gray-500 text-center w-2/3 mx-auto">
              Please wait while we process and add your transactions.
            </div>
          </div>
        </div>
      )}

      {isAdded && (
        <div className="p-3 pt-1">
          <div className="w-full flex flex-col items-center justify-center p-3">
            <div className="mb-2 p-2 rounded-full bg-neutral-900">
              <IconCheck size={22} className="text-white" />
            </div>
            <div className="text-lg font-semibold">
              {transactionsAdded} transactions added.
            </div>
            <div className="text-sm text-gray-500 text-center w-2/3 mx-auto">
              Out of {transactions.length} transactions from the CSV file
              uploaded, we have added {transactionsAdded} transactions.
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onBack();
          }}
          disabled={isLoading}
        >
          <IconArrowLeft size={16} />
          Back
        </Button>
        {!isAdded && (
          <Button
            size="sm"
            variant="default"
            onClick={handleAddTransactions}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner className="size-4" />
                Adding {transactions.length} transactions...
              </>
            ) : (
              <>
                Add {transactions.length} transactions
                <IconArrowRight size={16} />
              </>
            )}
          </Button>
        )}
        {isAdded && (
          <Button
            size="sm"
            variant="default"
            onClick={async () => {
              onComplete();
            }}
          >
            Close
            <IconArrowRight size={16} />
          </Button>
        )}
      </div>
    </>
  );
};
