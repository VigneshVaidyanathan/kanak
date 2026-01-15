'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@kanak/ui';
import * as React from 'react';
import { ManualMappingForm } from './manual-mapping-form';
import { TemplateMappingForm } from './template-mapping-form';

interface ColumnMappingFormProps {
  headers: string[];
  sampleRows: Record<string, string>[];
  onComplete: (
    mapping: Record<string, string>,
    mode: 'manual' | 'template'
  ) => void;
  onCancel: () => void;
  loading?: boolean;
}

const manualRequiredFields = [
  { key: 'date', label: 'Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'type', label: 'Type (Credit/Debit)' },
  { key: 'bankAccount', label: 'Bank Account' },
  { key: 'description', label: 'Description' },
] as const;

export function ColumnMappingForm({
  headers,
  sampleRows,
  onComplete,
  onCancel,
  loading = false,
}: ColumnMappingFormProps) {
  const [activeTab, setActiveTab] = React.useState<'manual' | 'template'>(
    'manual'
  );
  const [manualMapping, setManualMapping] = React.useState<
    Record<string, string>
  >({});
  const [templateMapping, setTemplateMapping] = React.useState<
    Record<string, string>
  >({});
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (activeTab === 'manual') {
      // Validate all required fields are mapped
      const missingFields = manualRequiredFields.filter(
        (field) => !manualMapping[field.key]
      );
      if (missingFields.length > 0) {
        setErrorMessage(
          `Please map the following required fields: ${missingFields
            .map((f) => f.label)
            .join(', ')}`
        );
        return;
      }
      onComplete(manualMapping, 'manual');
    } else {
      // Template mode validation
      const requiredFields = ['date', 'bankAccount', 'description'];
      const missingFields = requiredFields.filter(
        (field) => !templateMapping[field]
      );

      const hasWithdrawal =
        templateMapping.withdrawalAmount &&
        templateMapping.withdrawalAmount.trim() !== '';
      const hasDeposit =
        templateMapping.depositAmount &&
        templateMapping.depositAmount.trim() !== '';

      if (missingFields.length > 0) {
        setErrorMessage(
          `Please map the following required fields: ${missingFields
            .map((f) => {
              if (f === 'date') return 'Trans Date';
              if (f === 'bankAccount') return 'Bank Account';
              if (f === 'description') return 'Description';
              return f;
            })
            .join(', ')}`
        );
        return;
      }

      if (!hasWithdrawal && !hasDeposit) {
        setErrorMessage(
          'Please map at least one of Withdrawal Amount or Deposit Amount'
        );
        return;
      }

      onComplete(templateMapping, 'template');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Validation Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as 'manual' | 'template');
          setErrorMessage(null);
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="template">Template</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-4">
          <ManualMappingForm
            headers={headers}
            sampleRows={sampleRows}
            mapping={manualMapping}
            onMappingChange={setManualMapping}
          />
        </TabsContent>

        <TabsContent value="template" className="mt-4">
          <TemplateMappingForm
            headers={headers}
            sampleRows={sampleRows}
            mapping={templateMapping}
            onMappingChange={setTemplateMapping}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Process CSV'}
        </Button>
      </div>
    </form>
  );
}
