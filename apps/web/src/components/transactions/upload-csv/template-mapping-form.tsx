'use client';

import {
  useCsvUploadStore,
  type FileContent,
  type CsvColumnMapping,
  type DateFormat,
} from '@/store/csv-upload-store';
import { BankAccount } from '@kanak/shared';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kanak/ui';
import { IconArrowNarrowRight } from '@tabler/icons-react';
import { kanakTransactionProperties } from './column-mapping';

interface TemplateMappingFormProps {
  fileContent?: FileContent;
  columnMapping: CsvColumnMapping[];
  bankAccounts: BankAccount[];
  loadingBankAccounts: boolean;
  onMappingChange: (index: number, header: string | undefined) => void;
  onBankAccountChange: (index: number, bankAccountId: string) => void;
  dateFormat: DateFormat;
  setDateFormat: (format: DateFormat) => void;
  dateFormatOptions: { value: DateFormat; label: string }[];
}

const templateFields = [
  { key: 'date', label: 'Transaction Date', required: true },
  { key: 'withdrawalAmount', label: 'Withdrawal Amount', required: true },
  { key: 'depositAmount', label: 'Deposit Amount', required: true },
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
  dateFormat,
  setDateFormat,
  dateFormatOptions,
}: TemplateMappingFormProps) {
  if (!fileContent) return null;

  // Get property descriptions from kanakTransactionProperties
  const getPropertyDescription = (key: string): string | undefined => {
    const property = kanakTransactionProperties.find((p) => p.value === key);
    return property?.description;
  };

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
          {/* Date Format Selector as first item */}
          <div className="flex items-center w-full gap-5 px-4 py-2 border-b border-solid border-neutral-700">
            <div className="flex-1 text-sm flex flex-col items-start justify-center">
              <div className="font-semibold">Date Format</div>
              <div className="text-xs text-gray-500">
                <span className="font-semibold">(Required)</span> Select the
                date format used in your CSV file
              </div>
            </div>
            <div className="flex justify-center items-center flex-col">
              <IconArrowNarrowRight size={24} />
            </div>
            <div className="flex-1">
              <Select
                value={dateFormat}
                onValueChange={(value) => setDateFormat(value as DateFormat)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  {dateFormatOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {templateFields.map((field) => {
            const mapping = getMapping(field.key);
            const mappingIndex = columnMapping.findIndex(
              (cm) => cm.property.value === field.key
            );

            const propertyDescription = getPropertyDescription(field.key);
            const descriptionText =
              field.key === 'withdrawalAmount'
                ? 'The withdrawal amount. This will create Debit transactions.'
                : field.key === 'depositAmount'
                  ? 'The deposit amount. This will create Credit transactions.'
                  : propertyDescription;

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
                    </span>{' '}
                    {descriptionText}
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
