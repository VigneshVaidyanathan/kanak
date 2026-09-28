'use client';

import {
  excelToCsv,
  getParseErrorMessage,
  isExcelFile,
  parseCsvStructure,
} from '@/lib/csv-structure';
import { type FileContent, useCsvUploadStore } from '@/store/csv-upload-store';
import { Alert, AlertDescription, AlertTitle, Button } from '@kanak/ui';
import { IconArrowRight, IconWand } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';

export const UploadFile = ({
  onComplete,
  onClean,
}: {
  onComplete: (fileContent?: FileContent) => void;
  onClean: () => void;
}) => {
  const { rawContent, setFileName, setFileSize, setRawContent } =
    useCsvUploadStore();
  const [uploadFileStatus, setUploadFileStatus] = useState<
    'accepted' | 'rejected' | undefined
  >();
  const [acceptedFileName, setAcceptedFileName] = useState<string>();
  const [fileContent, setFileContent] = useState<FileContent>();
  const [parseError, setParseError] = useState<string | null>(null);

  // A readable file with a broken structure is fixable in the Clean CSV step.
  const needsCleaning = Boolean(parseError && rawContent);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setParseError(null);

      const clearSelection = () => {
        setUploadFileStatus(undefined);
        setFileContent(undefined);
        setAcceptedFileName(undefined);
      };

      if (fileRejections.length > 0) {
        setRawContent(undefined);
        setUploadFileStatus('rejected');
        setFileContent(undefined);
        setAcceptedFileName(undefined);
        setParseError(
          'Please upload a CSV or Excel file only. Only files with the .csv, .xlsx or .xls extension are accepted.'
        );
        return;
      }

      if (acceptedFiles.length === 0) {
        return;
      }

      const file = acceptedFiles[0];
      const isExcel = isExcelFile(file.name);
      const reader = new FileReader();

      reader.onabort = () => {
        clearSelection();
        setParseError(
          'Reading the file was cancelled. Please try uploading again.'
        );
      };
      reader.onerror = () => {
        clearSelection();
        setParseError(
          isExcel
            ? 'We couldn’t read the file. Please check that it’s a valid Excel file and try again.'
            : 'We couldn’t read the file. Please check that it’s a valid CSV and try again.'
        );
      };
      reader.onload = async () => {
        let content: string;
        try {
          // Excel becomes CSV text here, so every later step stays CSV-only.
          content = isExcel
            ? await excelToCsv(reader.result as ArrayBuffer)
            : (reader.result as string);
        } catch (error) {
          setRawContent(undefined);
          clearSelection();
          setParseError(getParseErrorMessage(error));
          return;
        }

        setRawContent(content);
        setFileName(file.name);
        setFileSize(file.size);
        try {
          setFileContent(parseCsvStructure(content));
          setUploadFileStatus('accepted');
          setAcceptedFileName(file.name);
          setParseError(null);
        } catch (error) {
          clearSelection();
          setParseError(getParseErrorMessage(error));
        }
      };

      if (isExcel) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    },
    [setFileName, setFileSize, setRawContent]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
    },
  });

  return (
    <>
      <div className="px-5 text-sm mt-2">
        Please make sure you are uploading a file with the{' '}
        <b className="mx-1">.csv</b>, <b className="mx-1">.xlsx</b> or
        <b className="mx-1">.xls</b>
        extension. The first entry of the file will be considered the column
        names. Please add column headers so its easy to map them in the next
        step. For Excel files we read the first sheet.
      </div>

      <div className="px-5 my-5">
        <div
          className={`w-full p-5 border-2 rounded border-dashed cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-neutral-500 hover:border-primary/50'
          }`}
          {...getRootProps()}
        >
          <input {...getInputProps()} accept=".csv,.xlsx,.xls" />
          {uploadFileStatus !== 'accepted' && (
            <div className="text-sm flex flex-col gap-2 items-center justify-center font-semibold">
              <div>Drag drop some files here, or click to select files.</div>
              <div>We support CSV and Excel (.xlsx, .xls) files.</div>
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
        {parseError && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Could not read the file</AlertTitle>
            <AlertDescription>
              {parseError}
              <span className="mt-2 block font-medium">
                Fix the file and upload it again, or clean it up right here.
              </span>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="mt-10 flex justify-end">
        {needsCleaning ? (
          <Button size="sm" variant="default" onClick={onClean}>
            <IconWand size={16} />
            Clean CSV
          </Button>
        ) : (
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
        )}
      </div>
    </>
  );
};
