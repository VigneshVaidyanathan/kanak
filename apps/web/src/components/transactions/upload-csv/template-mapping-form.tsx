'use client';

import {
  useCsvUploadStore,
  type FileContent,
  type CsvColumnMapping,
} from '@/store/csv-upload-store';
import { BankAccount } from '@kanak/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kanak/ui';
import { IconArrowNarrowRight } from '@tabler/icons-react';

interface TemplateMappingFormProps {
  fileContent?: FileContent;
  columnMapping: CsvColumnMapping[];
  bankAccounts: BankAccount[];
  loadingBankAccounts: boolean;
  onMappingChange: (index: number, header: string | undefined) => void;
  onBankAccountChange: (index: number, bankAccountId: string) => void;
}

const templateFields = [
  { key: 'date', label: 'Trans Date', required: true },
  { key: 'withdrawalAmount', label: 'Withdrawal Amount', required: false },
  { key: 'depositAmount', label: 'Deposit Amount', required: false },
  { key: 'bankAccount', label: 'Bank Account', required: true },
  { key: 'description', label: 'Description', required: true },
];

export function TemplateMappingForm({
  fileContent,
  columnMapping,
  bankAccounts,
  loadingBankAccounts,
  onMappingChange,
  onBankAccountChange,
}: TemplateMappingFormProps) {
  if (!fileContent) return null;

  // Get mappings for template fields
  const getMapping = (key: string) => {
    // For withdrawalAmount and depositAmount, we'll use a custom mapping
    if (key === 'withdrawalAmount' || key === 'depositAmount') {
      // Check if there's a custom mapping stored
      const customMapping = columnMapping.find(
        (cm) => cm.property.value === key
      );
      return customMapping;
    }
    // For other fields, find by property value
    return columnMapping.find((cm) => cm.property.value === key);
  };

  const handleTemplateFieldChange = (
    key: string,
    header: string | undefined
  ) => {
    // Find mapping for this field
    const mappingIndex = columnMapping.findIndex(
      (cm) => cm.property.value === key
    );

    if (mappingIndex === -1) {
      // This shouldn't happen if useEffect in parent component works correctly
      // But handle it gracefully
      return;
    }

    onMappingChange(mappingIndex, header);
  };

  return (
    <div className="flex flex-col mt-2">
      <div className="flex flex-col gap-2 flex-wrap">
        <div className="text-gray-500 text-sm">
          Map your CSV columns. Withdrawal Amount will create Debit
          transactions, Deposit Amount will create Credit transactions.
        </div>

        <div className="flex flex-col mt-3 items-center border border-neutral-700 border-solid rounded-md mx-10">
          {templateFields.map((field) => {
            const mapping = getMapping(field.key);
            const mappingIndex = columnMapping.findIndex(
              (cm) => cm.property.value === field.key
            );

            return (
              <div
                key={field.key}
                className="flex items-center w-full gap-5 px-4 py-2 border-b border-solid border-neutral-700 last:border-b-0"
              >
                <div className="flex-1 text-sm flex flex-col items-start justify-center">
                  <div className="font-semibold">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="font-semibold">
                      ({field.required ? 'Required' : 'Optional'})
                    </span>
                  </div>
                </div>
                <div className="flex justify-center items-center flex-col">
                  <IconArrowNarrowRight size={24} />
                </div>
                <div className="flex-1">
                  {field.key === 'bankAccount' ? (
                    <Select
                      value={mapping?.selectedBankAccountId || ''}
                      onValueChange={(value) => {
                        if (mappingIndex !== -1) {
                          onBankAccountChange(mappingIndex, value);
                        }
                      }}
                      disabled={loadingBankAccounts}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((bankAccount) => (
                          <SelectItem
                            key={bankAccount.id}
                            value={bankAccount.id}
                          >
                            {bankAccount.name} ({bankAccount.bankName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <>
                      <Select
                        value={mapping?.header || ''}
                        onValueChange={(value) =>
                          handleTemplateFieldChange(field.key, value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose mapping column from CSV" />
                        </SelectTrigger>
                        <SelectContent>
                          {fileContent.headers
                            .filter(
                              (header: string) => header && header.trim() !== ''
                            )
                            .map((header: string) => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {mapping?.headerIndex !== undefined && (
                        <div className="text-xs text-gray-500 mt-1">
                          Eg:{' '}
                          {fileContent.rows
                            .slice(0, 2)
                            .map(
                              (row: string[]) =>
                                (mapping.headerIndex !== undefined &&
                                  row[mapping.headerIndex]?.substring(0, 30)) ??
                                ''
                            )
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
