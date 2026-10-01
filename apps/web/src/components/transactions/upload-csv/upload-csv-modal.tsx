'use client';

import { useCsvUploadStore } from '@/store/csv-upload-store';
import { Stepper } from '@kanak/components';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kanak/ui';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import type { CreateTransactionInput } from '@kanak/shared';
import {
  IconArrowsShuffle,
  IconCheck,
  IconThumbUp,
  IconUpload,
  IconWand,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { ApplyRulesStep } from './apply-rules-step';
import { CleanCsv } from './clean-csv';
import { ColumnMapping } from './column-mapping';
import { UploadFile } from './upload-file';
import { VerifyTransactions } from './verify-transactions';

export const UploadCsvModal = ({ onClose }: { onClose: () => void }) => {
  const {
    activeStep,
    fileContent,
    transactions,
    setActiveStep,
    setFileContent,
    setTransactions,
    reset,
  } = useCsvUploadStore();

  const steps = [
    {
      icon: <IconUpload size={16} />,
      label: 'Upload file',
      description: 'Choose a CSV or Excel file',
    },
    {
      icon: <IconWand size={16} />,
      label: 'Clean CSV',
      description: 'Fix the file structure',
    },
    {
      icon: <IconArrowsShuffle size={16} />,
      label: 'Map columns',
      description: 'Match CSV columns',
    },
    {
      icon: <IconThumbUp size={16} />,
      label: 'Verify transactions',
      description: 'Verify and add transactions',
    },
    {
      icon: <IconWand size={16} />,
      label: 'Apply rules',
      description: 'Categorise what was imported',
    },
  ];

  const handleStepClick = (step: number) => {
    // Allow clicking on completed steps to navigate back
    if (step < activeStep) {
      setActiveStep(step);
    }
  };

  // Valid structure skips the clean step, broken files stop there.
  const handleUploadComplete = (fileContent?: any) => {
    setFileContent(fileContent);
    setActiveStep(fileContent ? 2 : 1);
  };

  const handleCleanComplete = (fileContent: any) => {
    setFileContent(fileContent);
    setActiveStep(2);
  };

  const handleMappingComplete = (transactions: any[]) => {
    setTransactions(transactions);
    setActiveStep(3);
  };

  const [imported, setImported] = useState<{
    ids: Id<'transactions'>[];
    rows: CreateTransactionInput[];
  } | null>(null);

  const handleImported = (
    ids: Id<'transactions'>[],
    rows: CreateTransactionInput[]
  ) => {
    setImported({ ids, rows });
    setActiveStep(4);
  };

  const handleVerifyComplete = () => {
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden [&>*]:overflow-visible"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex-1">
              Upload statement file
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              className="h-6 w-6"
            >
              <IconX size={16} />
            </Button>
          </div>
          <DialogDescription className="text-gray-400 text-sm">
            Choose a CSV or Excel file which contains the bank statement and
            upload it. Once the file is uploaded, we will show the columns
            present in the file and you can map them with the properties of the
            transactions that we track.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-10 min-w-0">
          <Stepper
            active={activeStep}
            onStepClick={handleStepClick}
            steps={steps}
            completedIcon={
              <IconCheck size={16} className="text-black dark:text-white" />
            }
          />

          <div className="mt-6 min-w-0">
            {activeStep === 0 && (
              <UploadFile
                onComplete={handleUploadComplete}
                onClean={() => setActiveStep(1)}
              />
            )}
            {activeStep === 1 && (
              <CleanCsv
                onComplete={handleCleanComplete}
                onBack={() => setActiveStep(0)}
              />
            )}
            {activeStep === 2 && (
              <ColumnMapping
                fileContent={fileContent}
                onComplete={handleMappingComplete}
                onBack={() => setActiveStep(0)}
              />
            )}
            {activeStep === 3 && (
              <VerifyTransactions
                transactions={transactions}
                onBack={() => setActiveStep(2)}
                onComplete={handleVerifyComplete}
                onImported={handleImported}
              />
            )}
            {activeStep === 4 && imported && (
              <ApplyRulesStep
                transactionIds={imported.ids}
                rows={imported.rows}
                onFinish={handleVerifyComplete}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
