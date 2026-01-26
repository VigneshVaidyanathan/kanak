'use client';

import { type FileContent, useCsvUploadStore } from '@/store/csv-upload-store';
import { Button } from '@kanak/ui';
import { IconArrowRight } from '@tabler/icons-react';
import { parse as parseCsv } from 'csv-parse/sync';
import { useCallback, useState } from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';

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

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        setUploadFileStatus('rejected');
        setFileContent(undefined);
      } else if (acceptedFiles.length > 0) {
        const reader = new FileReader();
        reader.onabort = () => {
          setUploadFileStatus('rejected');
          setFileContent(undefined);
        };
        reader.onerror = () => {
          setUploadFileStatus('rejected');
          setFileContent(undefined);
        };
        reader.onload = () => {
          const content = reader.result as string;
          parseStringIntoTable(content);

          const file = acceptedFiles[0];
          setUploadFileStatus('accepted');
          setAcceptedFileName(file.name);
          setFileName(file.name);
          setFileSize(file.size);
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

  const parseStringIntoTable = (content: string) => {
    const rows = parseCsv(content, {
      skip_empty_lines: true,
      delimiter: ',',
    }) as string[][];

    const parsedContent: FileContent = {
      headers: rows[0],
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
            <>
              <div>
                {acceptedFileName && (
                  <div className="text-sm flex gap-2 items-center justify-center">
                    You have chosen <b>{acceptedFileName}</b>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
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
