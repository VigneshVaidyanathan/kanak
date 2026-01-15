'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from '@kanak/ui';
import * as React from 'react';
import { ColumnMappingForm } from './column-mapping-form';

interface CsvUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (
    file: File
  ) => Promise<{ headers: string[]; sampleRows: Record<string, string>[] }>;
  onProcess: (
    mapping: Record<string, string>,
    csvData: Record<string, string>[]
  ) => Promise<void>;
}

export function CsvUploadModal({
  open,
  onOpenChange,
  onUpload,
  onProcess,
}: CsvUploadModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [sampleRows, setSampleRows] = React.useState<Record<string, string>[]>(
    []
  );
  const [step, setStep] = React.useState<'upload' | 'mapping'>('upload');
  const [loading, setLoading] = React.useState(false);

  const handleFileDrop = async (
    acceptedFiles: File[],
    fileRejections: any[],
    event: any
  ) => {
    if (fileRejections.length > 0) {
      console.error('File rejected:', fileRejections);
      if (typeof window !== 'undefined') {
        window.alert('Invalid file. Please upload a CSV file.');
      }
      return;
    }

    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    try {
      const result = await onUpload(selectedFile);
      setHeaders(result.headers);
      setSampleRows(result.sampleRows);
      setStep('mapping');
    } catch (error) {
      console.error('Error uploading CSV:', error);
      if (typeof window !== 'undefined') {
        window.alert('Failed to upload CSV file');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMappingComplete = async (
    mapping: Record<string, string>,
    mode: 'manual' | 'template'
  ) => {
    if (!file) return;

    setLoading(true);
    try {
      // Re-parse the file with the mapping
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());
      const csvHeaders = lines[0].split(',').map((h) => h.trim());
      const csvData = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const row: Record<string, string> = {};
        csvHeaders.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      // If template mode, convert withdrawal/deposit columns to standard format
      if (mode === 'template') {
        const processedData: Record<string, string>[] = [];

        for (const row of csvData) {
          const withdrawalCol = mapping.withdrawalAmount;
          const depositCol = mapping.depositAmount;
          const dateCol = mapping.date;
          const bankAccountCol = mapping.bankAccount;
          const descriptionCol = mapping.description;

          // Check withdrawal amount
          if (withdrawalCol && row[withdrawalCol]) {
            const withdrawalValue = parseFloat(row[withdrawalCol] || '0');
            if (withdrawalValue !== 0) {
              const transaction: Record<string, string> = {
                date: dateCol ? row[dateCol] || '' : '',
                amount: row[withdrawalCol] || '',
                type: 'debit',
                bankAccount: bankAccountCol ? row[bankAccountCol] || '' : '',
                description: descriptionCol ? row[descriptionCol] || '' : '',
              };
              processedData.push(transaction);
            }
          }

          // Check deposit amount
          if (depositCol && row[depositCol]) {
            const depositValue = parseFloat(row[depositCol] || '0');
            if (depositValue !== 0) {
              const transaction: Record<string, string> = {
                date: dateCol ? row[dateCol] || '' : '',
                amount: row[depositCol] || '',
                type: 'credit',
                bankAccount: bankAccountCol ? row[bankAccountCol] || '' : '',
                description: descriptionCol ? row[descriptionCol] || '' : '',
              };
              processedData.push(transaction);
            }
          }
        }

        // For template mode, the processed data already has field names as keys
        // Create an identity mapping so onProcess can extract values correctly
        const standardMapping: Record<string, string> = {
          date: 'date',
          amount: 'amount',
          type: 'type',
          bankAccount: 'bankAccount',
          description: 'description',
          reason: '', // Empty since we're not mapping reason in template mode
        };

        await onProcess(standardMapping, processedData);
      } else {
        // Manual mode - use mapping as-is
        await onProcess(mapping, csvData);
      }

      onOpenChange(false);
      setStep('upload');
      setFile(null);
      setHeaders([]);
      setSampleRows([]);
    } catch (error) {
      console.error('Error processing CSV:', error);
      if (typeof window !== 'undefined') {
        window.alert('Failed to process CSV file');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload CSV Transactions</DialogTitle>
          <DialogDescription>
            {step === 'upload'
              ? 'Select a CSV file to upload and map columns'
              : 'Map your CSV columns to the required transaction fields'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <Dropzone
              accept={{
                'text/csv': ['.csv'],
                'application/vnd.ms-excel': ['.csv'],
              }}
              maxFiles={1}
              maxSize={10 * 1024 * 1024} // 10MB
              onDrop={handleFileDrop}
              disabled={loading}
              src={file ? [file] : undefined}
            >
              <DropzoneEmptyState>
                <p className="text-xs text-muted-foreground mt-2">
                  CSV files only (max 10MB)
                </p>
              </DropzoneEmptyState>
              <DropzoneContent />
            </Dropzone>
          </div>
        )}

        {step === 'mapping' && (
          <ColumnMappingForm
            headers={headers}
            sampleRows={sampleRows}
            onComplete={handleMappingComplete}
            onCancel={() => {
              setStep('upload');
              setFile(null);
              setHeaders([]);
              setSampleRows([]);
            }}
            loading={loading}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
