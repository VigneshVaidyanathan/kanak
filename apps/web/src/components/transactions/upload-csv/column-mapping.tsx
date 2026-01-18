'use client';

import { useAuthStore } from '@/store/auth-store';
import {
  useCsvUploadStore,
  type CsvColumnMapping,
  type DateFormat,
  type FileContent,
} from '@/store/csv-upload-store';
import { BankAccount, Transaction } from '@kanak/shared';
import { Alert, AlertDescription, AlertTitle, Button } from '@kanak/ui';
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
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
  const { token } = useAuthStore();
  const {
    columnMapping,
    setColumnMapping,
    setCsvData,
    dateFormat,
    setDateFormat,
  } = useCsvUploadStore();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Fetch bank accounts
  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (!token) return;

      try {
        setLoadingBankAccounts(true);
        const response = await fetch('/api/bank-accounts', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBankAccounts(data);
        }
      } catch (error) {
        console.error('Error fetching bank accounts:', error);
      } finally {
        setLoadingBankAccounts(false);
      }
    };

    fetchBankAccounts();
  }, [token]);

  useEffect(() => {
    setColumnMapping(
      kanakTransactionProperties.map((p) => {
        return {
          property: p,
        };
      })
    );
  }, [setColumnMapping]);

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
