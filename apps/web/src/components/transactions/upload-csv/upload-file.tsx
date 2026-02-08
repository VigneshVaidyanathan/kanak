'use client';

import { type FileContent, useCsvUploadStore } from '@/store/csv-upload-store';
import { Alert, AlertDescription, AlertTitle, Button } from '@kanak/ui';
import { IconArrowRight } from '@tabler/icons-react';
import { parse as parseCsv } from 'csv-parse/sync';
import { useCallback, useState } from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';

/**
 * Turn CSV parse errors into a short, user-friendly message.
 */
function getParseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message || '';
    // csv-parse often includes "at line X" or "at column X"
    if (msg.toLowerCase().includes('quote')) {
      return 'Invalid or unclosed quotes in the CSV. Check that every quoted value is properly closed.';
    }
    if (
      msg.toLowerCase().includes('delimiter') ||
      msg.toLowerCase().includes('column')
    ) {
      return 'The CSV structure seems invalid. Make sure the file uses commas to separate columns.';
    }
    if (msg.toLowerCase().includes('line')) {
      return msg.length > 120 ? `${msg.slice(0, 120)}…` : msg;
    }
    return msg.length > 120 ? `${msg.slice(0, 120)}…` : msg;
  }
  return 'The file could not be read. Please ensure it is a valid CSV file.';
}

export const UploadFile = ({
  onComplete,
}: {
  onComplete: (fileContent?: FileContent) => void;
}) => {
  const { setFileName, setFileSize } = useCsvUploadStore();
  const [uploadFileStatus, setUploadFileStatus] = useState<
    'accepted' | 'rejected' | undefined
  >();
  const [acceptedFileName, setAcceptedFileName] = useState<string>();
  const [fileContent, setFileContent] = useState<FileContent>();
  const [parseError, setParseError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setParseError(null);

      if (fileRejections.length > 0) {
        setUploadFileStatus('rejected');
        setFileContent(undefined);
        setAcceptedFileName(undefined);
        setParseError(
          'Please upload a CSV file only. Only files with the .csv extension are accepted.'
        );
      } else if (acceptedFiles.length > 0) {
        const reader = new FileReader();
        reader.onabort = () => {
          setUploadFileStatus(undefined);
          setFileContent(undefined);
          setAcceptedFileName(undefined);
          setParseError(
            'Reading the file was cancelled. Please try uploading again.'
          );
        };
        reader.onerror = () => {
          setUploadFileStatus(undefined);
          setFileContent(undefined);
          setAcceptedFileName(undefined);
          setParseError(
            'We couldn’t read the file. Please check that it’s a valid CSV and try again.'
          );
        };
        reader.onload = () => {
          const content = reader.result as string;
          try {
            parseStringIntoTable(content);
            const file = acceptedFiles[0];
            setUploadFileStatus('accepted');
            setAcceptedFileName(file.name);
            setFileName(file.name);
            setFileSize(file.size);
            setParseError(null);
          } catch (error) {
            setUploadFileStatus(undefined);
            setFileContent(undefined);
            setAcceptedFileName(undefined);
            setParseError(getParseErrorMessage(error));
          }
        };
        reader.readAsText(acceptedFiles[0]);
      }
    },
    [setFileName, setFileSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
  });

  const parseStringIntoTable = (content: string): void => {
    const rows = parseCsv(content, {
      skip_empty_lines: true,
      delimiter: ',',
    }) as string[][];

    if (!rows || rows.length === 0) {
      throw new Error(
        'The file is empty or has no valid rows. Please upload a CSV with a header row and at least one data row.'
      );
    }
    const headers = rows[0];
    if (
      !headers ||
      headers.length === 0 ||
      headers.every((h: string) => !h?.trim())
    ) {
      throw new Error(
        'The file has no column headers. The first row should contain column names.'
      );
    }

    const parsedContent: FileContent = {
      headers,
      rows: rows.slice(1),
      totalRows: rows.length - 1,
    };

    setFileContent(parsedContent);
  };

  return (
    <>
      <div className="px-5 text-sm mt-2">
        Please make sure you are uploading a file with the{' '}
        <b className="mx-1">.csv</b>
        extension. The first entry of the file will be considered the column
        names. Please add column headers so its easy to map them in the next
        step.
      </div>

      {parseError && (
        <div className="px-5 mt-4">
          <Alert variant="destructive">
            <AlertTitle>Could not read the CSV file</AlertTitle>
            <AlertDescription>
              {parseError}
              <span className="mt-2 block font-medium">
                Please fix the file and upload it again.
              </span>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="px-5 my-5">
        <div
          className={`w-full p-5 border-2 rounded border-dashed cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-neutral-500 hover:border-primary/50'
          }`}
          {...getRootProps()}
        >
          <input {...getInputProps()} accept=".csv" />
          {uploadFileStatus !== 'accepted' && (
            <div className="text-sm flex flex-col gap-2 items-center justify-center font-semibold">
              <div>Drag drop some files here, or click to select files.</div>
              <div>Currently we support only CSV files.</div>
            </div>
          )}
          {uploadFileStatus === 'accepted' && (
            <div className="text-sm flex flex-col gap-1 items-center justify-center text-muted-foreground">
              {acceptedFileName && (
                <span className="font-medium text-foreground">
                  {acceptedFileName}
                </span>
              )}
              <span>File selected.</span>
            </div>
          )}
        </div>
        {uploadFileStatus === 'accepted' && (
          <p className="text-sm text-muted-foreground mt-2 text-center">
            The file is valid. Hit the button below to map columns.
          </p>
        )}
      </div>

      <div className="mt-10 flex justify-end">
        <Button
          disabled={uploadFileStatus !== 'accepted'}
          size="sm"
          variant="default"
          onClick={() => {
            onComplete(fileContent);
          }}
        >
          Proceed to map columns
          <IconArrowRight size={16} />
        </Button>
      </div>
    </>
  );
};
