'use client';

import { getParseErrorMessage, parseCsvStructure } from '@/lib/csv-structure';
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

      if (fileRejections.length > 0) {
        setRawContent(undefined);
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
          const file = acceptedFiles[0];
          setRawContent(content);
          setFileName(file.name);
          setFileSize(file.size);
          try {
            setFileContent(parseCsvStructure(content));
            setUploadFileStatus('accepted');
            setAcceptedFileName(file.name);
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
    [setFileName, setFileSize, setRawContent]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
  });

  return (
    <>
      <div className="px-5 text-sm mt-2">
        Please make sure you are uploading a file with the{' '}
        <b className="mx-1">.csv</b>
        extension. The first entry of the file will be considered the column
        names. Please add column headers so its easy to map them in the next
        step.
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
        {parseError && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Could not read the CSV file</AlertTitle>
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
