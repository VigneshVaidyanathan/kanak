'use client';

import {
  type CsvColumnMapping,
  type FileContent,
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

interface ManualMappingFormProps {
  fileContent?: FileContent;
  columnMapping: CsvColumnMapping[];
  bankAccounts: BankAccount[];
  loadingBankAccounts: boolean;
  onMappingChange: (index: number, header: string | undefined) => void;
  onBankAccountChange: (index: number, bankAccountId: string) => void;
}

// Manual mode fields - exclude reason and category
const manualFields = ['date', 'amount', 'type', 'bankAccount', 'description'];

export function ManualMappingForm({
  fileContent,
  columnMapping,
  bankAccounts,
  loadingBankAccounts,
  onMappingChange,
  onBankAccountChange,
}: ManualMappingFormProps) {
  // Filter to show only manual fields (exclude reason and category)
  const filteredMapping = columnMapping.filter((m) =>
    manualFields.includes(m.property.value)
  );

  if (!fileContent) return null;

  return (
    <div className="flex flex-col mt-2">
      <div className="flex flex-col gap-2 flex-wrap">
        <div className="text-gray-500 text-sm">
          Map the columns from the CSV file to the expense properties in Kanak.
          We need this to make sure we map the right data from CSV to the right
          properties.
        </div>

        <div className="flex flex-col mt-3 items-center border border-neutral-700 border-solid rounded-md mx-10">
          {filteredMapping.map((mapping: CsvColumnMapping, i: number) => {
            const prop = mapping.property;
            // Find the original index in columnMapping
            const originalIndex = columnMapping.findIndex(
              (cm) => cm.property.value === prop.value
            );

            return (
              <div
                key={prop.value}
                className="flex items-center w-full gap-5 px-4 py-2 border-b border-solid border-neutral-700 last:border-b-0"
              >
                <div className="flex-1 text-sm flex flex-col items-start justify-center">
                  <div className="font-semibold">{prop.label}</div>
                  <div className="text-xs text-gray-500">
                    <span className="font-semibold">
                      ({prop.isRequired ? 'Required' : 'Optional'})
                    </span>{' '}
                    {prop.description}
                  </div>
                </div>
                <div className="flex justify-center items-center flex-col">
                  <IconArrowNarrowRight size={24} />
                </div>
                <div className="flex-1">
                  {prop.value === 'bankAccount' ? (
                    <Select
                      value={mapping.selectedBankAccountId ?? ''}
                      onValueChange={(value) => {
                        if (value) {
                          onBankAccountChange(originalIndex, value);
                        }
                      }}
                      disabled={loadingBankAccounts}
                      modal={false}
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
                        value={mapping.header ?? ''}
                        onValueChange={(value) => {
                          onMappingChange(originalIndex, value || undefined);
                        }}
                        modal={false}
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
                      {mapping.headerIndex !== undefined && (
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
