'use client';

import {
  useCsvUploadStore,
  type CsvColumnMapping,
  type DateFormat,
  type FileContent,
} from '@/store/csv-upload-store';
import { api } from '@kanak/convex/src/_generated/api';
import { Transaction } from '@kanak/shared';
import { Alert, AlertDescription, AlertTitle, Button } from '@kanak/ui';
import {
  IconArrowLeft,
  IconArrowRight,
  IconSparkles,
} from '@tabler/icons-react';
import { useQuery } from 'convex/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TemplateMappingForm } from './template-mapping-form';

export type CsvTransactionMappingProperty = {
  label: string;
  value: string;
  description?: string;
  isRequired: boolean;
};

export const kanakTransactionProperties: CsvTransactionMappingProperty[] = [
  {
    label: 'Transaction Date',
    value: 'date',
    description: 'The date on which the transaction was made.',
    isRequired: true,
  },
  {
    label: 'Withdrawal Amount',
    value: 'withdrawalAmount',
    description: 'The withdrawal amount. This will create Debit transactions.',
    isRequired: true,
  },
  {
    label: 'Deposit Amount',
    value: 'depositAmount',
    description: 'The deposit amount. This will create Credit transactions.',
    isRequired: true,
  },
  {
    label: 'Transaction Amount',
    value: 'amount',
    description: 'The transaction amount. It can be decimal.',
    isRequired: true,
  },
  {
    label: 'Transaction Type',
    value: 'type',
    description:
      'The type of transaction. Possible values are Credit or Debit.',
    isRequired: true,
  },
  {
    label: 'Bank Account',
    value: 'bankAccount',
    description: 'Select a bank account from your configured bank accounts.',
    isRequired: true,
  },
  {
    label: 'Description',
    value: 'description',
    description: 'A brief description of the transaction.',
    isRequired: true,
  },
  {
    label: 'Reason',
    value: 'reason',
    description: 'The reason for the transaction.',
    isRequired: false,
  },
  {
    label: 'Category',
    value: 'category',
    description: 'Optional category for the transaction.',
    isRequired: false,
  },
];

export const ColumnMapping = ({
  fileContent,
  onComplete,
  onBack,
}: {
  fileContent?: FileContent;
  onComplete: (transactions: any[]) => void;
  onBack: () => void;
}) => {
  const {
    columnMapping,
    setColumnMapping,
    setCsvData,
    dateFormat,
    setDateFormat,
  } = useCsvUploadStore();
  const bankAccountsResult = useQuery(
    api.bankAccounts.getBankAccountsByUserId,
    {}
  );
  const loadingBankAccounts = bankAccountsResult === undefined;
  const bankAccounts = useMemo(
    () => bankAccountsResult ?? [],
    [bankAccountsResult]
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoMapping, setAutoMapping] = useState(false);
  const autoMappedFor = useRef<FileContent | undefined>(undefined);

  const dateFormatOptions: { value: DateFormat; label: string }[] = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g., 25/12/2024)' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g., 12/25/2024)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g., 2024-12-25)' },
    { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (e.g., 25-12-2024)' },
    { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY (e.g., 12-25-2024)' },
    { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (e.g., 25.12.2024)' },
    { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD (e.g., 2024/12/25)' },
    { value: 'auto', label: 'Auto-detect' },
  ];

  useEffect(() => {
    setColumnMapping(
      kanakTransactionProperties.map((p) => {
        return {
          property: p,
        };
      })
    );
  }, [setColumnMapping]);

  // Ask Jev to fill in the mapping. Suggestions only: the user still edits.
  const autoMap = useCallback(async () => {
    if (!fileContent) return;

    setAutoMapping(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/csv/map-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headers: fileContent.headers,
          rows: fileContent.rows.slice(0, 5),
          // Bank account is picked from a dropdown, not a CSV column.
          properties: kanakTransactionProperties
            .filter((p) => p.value !== 'bankAccount')
            .map(({ value, label, description }) => ({
              value,
              label,
              description,
            })),
        }),
      });

      if (response.status === 401) {
        window.location.href = '/auth';
        return;
      }

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({}));
        console.error('Auto-mapping columns failed:', response.status, error);
        setErrorMessage(
          response.status === 503
            ? 'Auto-mapping is not configured. Map the columns manually.'
            : 'Could not auto-map the columns. Map them manually.'
        );
        return;
      }

      const { columns, dateFormat: suggestedFormat } = await response.json();
      setColumnMapping(
        kanakTransactionProperties.map((p) => {
          const headerIndex = columns?.[p.value]?.headerIndex;
          if (headerIndex === undefined) return { property: p };
          return {
            property: p,
            header: fileContent.headers[headerIndex],
            headerIndex,
          };
        })
      );
      if (suggestedFormat) setDateFormat(suggestedFormat as DateFormat);
    } catch (error) {
      console.error('Auto-mapping columns failed:', error);
      setErrorMessage('Could not auto-map the columns. Map them manually.');
    } finally {
      setAutoMapping(false);
    }
  }, [fileContent, setColumnMapping, setDateFormat]);

  // Run once per file; the AI Suggest button re-runs it on demand.
  useEffect(() => {
    if (!fileContent) return;
    if (autoMappedFor.current === fileContent) return;
    autoMappedFor.current = fileContent;
    autoMap();
  }, [fileContent, autoMap]);

  const canComplete = useMemo(() => {
    // Template mode: check date, bankAccount, description, and both withdrawal/deposit
    const requiredFields = [
      'date',
      'bankAccount',
      'description',
      'withdrawalAmount',
      'depositAmount',
    ];
    const hasRequiredFields = !columnMapping.some((s: CsvColumnMapping) => {
      if (!requiredFields.includes(s.property.value)) return false;
      if (s.property.value === 'bankAccount') {
        return s.property.isRequired && !s.selectedBankAccountId;
      }
      return s.property.isRequired && s.headerIndex === undefined;
    });

    return hasRequiredFields;
  }, [columnMapping]);

  const mapTransactions = () => {
    if (!fileContent) return;

    setErrorMessage(null);

    // Convert rows to CSV data format (array of objects with CSV column names as keys)
    const csvData: Record<string, string>[] = fileContent.rows.map(
      (row: string[]) => {
        const rowObj: Record<string, string> = {};
        fileContent.headers.forEach((header: string, index: number) => {
          rowObj[header] = row[index] || '';
        });
        return rowObj;
      }
    );
    setCsvData(csvData);

    // Get selected bank account
    const bankAccountMapping = columnMapping.find(
      (m: CsvColumnMapping) => m.property.value === 'bankAccount'
    );
    const selectedBankAccount = bankAccounts.find(
      (ba) => ba.id === bankAccountMapping?.selectedBankAccountId
    );
    const selectedBankAccountName = selectedBankAccount?.name;

    // Template mode: process withdrawal/deposit columns
    const dateMapping = columnMapping.find(
      (cm) => cm.property.value === 'date'
    );
    const withdrawalMapping = columnMapping.find(
      (cm) => cm.property.value === 'withdrawalAmount'
    );
    const depositMapping = columnMapping.find(
      (cm) => cm.property.value === 'depositAmount'
    );
    const descriptionMapping = columnMapping.find(
      (cm) => cm.property.value === 'description'
    );

    const transactions: Transaction[] = [];

    fileContent.rows.forEach((row: string[]) => {
      const dateIndex = dateMapping?.headerIndex;
      const withdrawalIndex = withdrawalMapping?.headerIndex;
      const depositIndex = depositMapping?.headerIndex;
      const descriptionIndex = descriptionMapping?.headerIndex;

      let trans: any = null;

      // Check withdrawal amount first - if it has a non-zero value, create debit transaction
      if (withdrawalIndex !== undefined) {
        const withdrawalValue = parseFloat(row[withdrawalIndex] || '0');
        if (!isNaN(withdrawalValue) && withdrawalValue !== 0) {
          const dateValue =
            dateIndex !== undefined ? row[dateIndex] : undefined;
          trans = {
            date: dateValue,
            accountingDate: dateValue,
            amount: row[withdrawalIndex],
            type: 'debit',
            bankAccount: selectedBankAccountName,
            description:
              descriptionIndex !== undefined
                ? row[descriptionIndex]
                : undefined,
          };
        }
      }

      // If no withdrawal transaction, check deposit amount - if it has a non-zero value, create credit transaction
      if (!trans && depositIndex !== undefined) {
        const depositValue = parseFloat(row[depositIndex] || '0');
        if (!isNaN(depositValue) && depositValue !== 0) {
          const dateValue =
            dateIndex !== undefined ? row[dateIndex] : undefined;
          trans = {
            date: dateValue,
            accountingDate: dateValue,
            amount: row[depositIndex],
            type: 'credit',
            bankAccount: selectedBankAccountName,
            description:
              descriptionIndex !== undefined
                ? row[descriptionIndex]
                : undefined,
          };
        }
      }

      // Only add transaction if it was created and has all required fields
      if (trans) {
        if (
          trans.bankAccount &&
          trans.amount !== undefined &&
          trans.amount !== null &&
          trans.amount !== '' &&
          trans.date &&
          trans.date !== null &&
          trans.date !== '' &&
          trans.type &&
          trans.description
        ) {
          transactions.push(trans);
        }
      }
      // If neither withdrawal nor deposit has a value, skip this row (no transaction created)
    });

    if (transactions.length === 0) {
      setErrorMessage(
        'No valid transactions found. Please check your mapping.'
      );
      return;
    }

    onComplete(transactions);
  };

  const handleMappingChange = (index: number, header: string | undefined) => {
    if (index < 0 || index >= columnMapping.length) {
      console.warn(`Invalid mapping index: ${index}`);
      return;
    }

    const newMapping = [...columnMapping];
    if (fileContent && header && header.trim() !== '') {
      const headerIndex = fileContent.headers.findIndex(
        (h: string) => h === header
      );
      newMapping[index] = {
        ...newMapping[index],
        header: header,
        headerIndex: headerIndex >= 0 ? headerIndex : undefined,
      };
    } else {
      newMapping[index] = {
        ...newMapping[index],
        header: undefined,
        headerIndex: undefined,
      };
    }
    setColumnMapping(newMapping);
  };

  const handleBankAccountChange = (index: number, bankAccountId: string) => {
    if (index < 0 || index >= columnMapping.length) {
      console.warn(`Invalid mapping index: ${index}`);
      return;
    }

    const newMapping = [...columnMapping];
    newMapping[index] = {
      ...newMapping[index],
      selectedBankAccountId: bankAccountId,
    };
    setColumnMapping(newMapping);
  };

  return (
    <>
      <div className="px-3">
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Validation Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        <div className="mb-2 flex items-center justify-end gap-2">
          {autoMapping && (
            <span className="text-sm text-gray-500">
              Matching your CSV columns…
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={autoMap}
            disabled={autoMapping || !fileContent}
          >
            <IconSparkles size={16} />
            AI Suggest
          </Button>
        </div>
        {fileContent && (
          <TemplateMappingForm
            fileContent={fileContent}
            columnMapping={columnMapping}
            bankAccounts={bankAccounts}
            loadingBankAccounts={loadingBankAccounts}
            onMappingChange={handleMappingChange}
            onBankAccountChange={handleBankAccountChange}
            dateFormat={dateFormat}
            setDateFormat={setDateFormat}
            dateFormatOptions={dateFormatOptions}
          />
        )}
      </div>
      <div className="mt-10 flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onBack();
          }}
        >
          <IconArrowLeft size={16} />
          Back
        </Button>
        <Button
          size="sm"
          variant="default"
          onClick={() => {
            mapTransactions();
          }}
          disabled={!canComplete}
        >
          Proceed to verify transactions
          <IconArrowRight size={16} />
        </Button>
      </div>
    </>
  );
};
