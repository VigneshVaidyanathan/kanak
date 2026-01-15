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

interface ManualMappingFormProps {
  headers: string[];
  sampleRows: Record<string, string>[];
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
}

const requiredFields = [
  { key: 'date', label: 'Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'type', label: 'Type (Credit/Debit)' },
  { key: 'bankAccount', label: 'Bank Account' },
  { key: 'description', label: 'Description' },
] as const;

export function ManualMappingForm({
  headers,
  sampleRows,
  mapping,
  onMappingChange,
}: ManualMappingFormProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Required Fields</h3>
        {requiredFields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            <Select
              value={mapping[field.key] || ''}
              onValueChange={(value) =>
                onMappingChange({ ...mapping, [field.key]: value })
              }
              required
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

      {sampleRows.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Preview (First 3 rows)</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {requiredFields.map((field) => (
                    <th
                      key={field.key}
                      className="px-4 py-2 text-left font-medium"
                    >
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleRows.slice(0, 3).map((row, idx) => (
                  <tr key={idx} className="border-t">
                    {requiredFields.map((field) => (
                      <td key={field.key} className="px-4 py-2">
                        {mapping[field.key]
                          ? row[mapping[field.key]] || '-'
                          : '-'}
                      </td>
                    ))}
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
