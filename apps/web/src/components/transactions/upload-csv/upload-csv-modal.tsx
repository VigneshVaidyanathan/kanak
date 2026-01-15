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
import {
  IconArrowsShuffle,
  IconCheck,
  IconThumbUp,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
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
      description: 'Choose a CSV file',
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
  ];

  const handleStepClick = (step: number) => {
    // Allow clicking on completed steps to navigate back
    if (step < activeStep) {
      setActiveStep(step);
    }
  };

  const handleUploadComplete = (fileContent?: any) => {
    setFileContent(fileContent);
    setActiveStep(1);
  };

  const handleMappingComplete = (transactions: any[]) => {
    setTransactions(transactions);
    setActiveStep(2);
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
        className="sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex-1">
              Upload CSV file
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
            Choose a CSV file which contains the bank statement and upload it.
            Once the file is uploaded, we will show the columns present in the
            file and you can map them with the properties of the transactions
            that we track.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-10">
          <Stepper
            active={activeStep}
            onStepClick={handleStepClick}
            steps={steps}
            completedIcon={
              <IconCheck size={16} className="text-black dark:text-white" />
            }
          />

          <div className="mt-6">
            {activeStep === 0 && (
              <UploadFile onComplete={handleUploadComplete} />
            )}
            {activeStep === 1 && (
              <ColumnMapping
                fileContent={fileContent}
                onComplete={handleMappingComplete}
                onBack={() => setActiveStep(0)}
              />
            )}
            {activeStep === 2 && (
              <VerifyTransactions
                transactions={transactions}
                onBack={() => setActiveStep(1)}
                onComplete={handleVerifyComplete}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
