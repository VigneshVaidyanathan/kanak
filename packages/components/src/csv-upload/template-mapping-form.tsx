'use client';

import * as React from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kanak/ui';

interface TemplateMappingFormProps {
  headers: string[];
  sampleRows: Record<string, string>[];
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
}

const templateFields = [
  { key: 'date', label: 'Trans Date' },
  { key: 'withdrawalAmount', label: 'Withdrawal Amount' },
  { key: 'depositAmount', label: 'Deposit Amount' },
  { key: 'bankAccount', label: 'Bank Account' },
  { key: 'description', label: 'Description' },
] as const;

export function TemplateMappingForm({
  headers,
  sampleRows,
  mapping,
  onMappingChange,
}: TemplateMappingFormProps) {
  // Generate preview rows showing how transactions will be created
  const previewRows = React.useMemo(() => {
    if (sampleRows.length === 0) return [];

    return sampleRows.slice(0, 3).flatMap((row) => {
      const withdrawalCol = mapping.withdrawalAmount;
      const depositCol = mapping.depositAmount;
      const dateCol = mapping.date;
      const bankAccountCol = mapping.bankAccount;
      const descriptionCol = mapping.description;

      const transactions: Array<{
        date: string;
        amount: string;
        type: string;
        bankAccount: string;
        description: string;
      }> = [];

      // Check withdrawal amount
      if (withdrawalCol && row[withdrawalCol]) {
        const withdrawalValue = parseFloat(row[withdrawalCol] || '0');
        if (withdrawalValue !== 0) {
          transactions.push({
            date: dateCol ? row[dateCol] || '-' : '-',
            amount: row[withdrawalCol] || '-',
            type: 'Debit',
            bankAccount: bankAccountCol ? row[bankAccountCol] || '-' : '-',
            description: descriptionCol ? row[descriptionCol] || '-' : '-',
          });
        }
      }

      // Check deposit amount
      if (depositCol && row[depositCol]) {
        const depositValue = parseFloat(row[depositCol] || '0');
        if (depositValue !== 0) {
          transactions.push({
            date: dateCol ? row[dateCol] || '-' : '-',
            amount: row[depositCol] || '-',
            type: 'Credit',
            bankAccount: bankAccountCol ? row[bankAccountCol] || '-' : '-',
            description: descriptionCol ? row[descriptionCol] || '-' : '-',
          });
        }
      }

      // If neither withdrawal nor deposit has a value, skip this row in preview
      // (it will be skipped during processing as well)

      return transactions;
    });
  }, [sampleRows, mapping]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Template Fields</h3>
        <p className="text-sm text-muted-foreground">
          Map your CSV columns. Withdrawal Amount will create Debit
          transactions, Deposit Amount will create Credit transactions.
        </p>
        {templateFields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {(field.key === 'date' ||
                field.key === 'bankAccount' ||
                field.key === 'description') && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            <Select
              value={mapping[field.key] || ''}
              onValueChange={(value) =>
                onMappingChange({ ...mapping, [field.key]: value })
              }
              required={
                field.key === 'date' ||
                field.key === 'bankAccount' ||
                field.key === 'description'
              }
            >
              <SelectTrigger id={field.key}>
                <SelectValue placeholder="Select column..." />
              </SelectTrigger>
              <SelectContent>
                {headers.map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {sampleRows.length > 0 && previewRows.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Preview (First 3 rows)</h3>
          <p className="text-xs text-muted-foreground mb-2">
            Note: Rows with both withdrawal and deposit amounts will create two
            transactions.
          </p>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Amount</th>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-left font-medium">
                    Bank Account
                  </th>
                  <th className="px-4 py-2 text-left font-medium">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((transaction, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">{transaction.date}</td>
                    <td className="px-4 py-2">{transaction.amount}</td>
                    <td className="px-4 py-2">{transaction.type}</td>
                    <td className="px-4 py-2">{transaction.bankAccount}</td>
                    <td className="px-4 py-2">{transaction.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
