'use client';

import { getParseErrorMessage, parseCsvStructure } from '@/lib/csv-structure';
import { type FileContent, useCsvUploadStore } from '@/store/csv-upload-store';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  ButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@kanak/ui';
import {
  IconArrowLeft,
  IconArrowRight,
  IconFileText,
  IconTable,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';

export const CleanCsv = ({
  onComplete,
  onBack,
}: {
  onComplete: (fileContent: FileContent) => void;
  onBack: () => void;
}) => {
  const { rawContent, setRawContent } = useCsvUploadStore();
  const [content, setContent] = useState(rawContent ?? '');
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'text' | 'table'>('text');

  // Only parse for the preview when the table view is actually open.
  const preview = useMemo(() => {
    if (view !== 'table') return null;
    try {
      return { fileContent: parseCsvStructure(content), error: null };
    } catch (err) {
      return { fileContent: null, error: getParseErrorMessage(err) };
    }
  }, [content, view]);

  const handleValidate = () => {
    try {
      const fileContent = parseCsvStructure(content);
      setRawContent(content);
      setError(null);
      onComplete(fileContent);
    } catch (err) {
      setError(getParseErrorMessage(err));
    }
  };

  return (
    <>
      <div className="px-5 mt-2 flex items-start justify-between gap-4">
        <div className="text-sm">
          The file structure could not be read. Edit the CSV content below — fix
          broken quotes, remove extra header lines or stray rows — and validate
          it before mapping the columns.
        </div>
        <ButtonGroup className="shrink-0">
          <Button
            size="sm"
            variant={view === 'table' ? 'default' : 'outline'}
            onClick={() => setView('table')}
          >
            <IconTable size={16} />
            Table
          </Button>
          <Button
            size="sm"
            variant={view === 'text' ? 'default' : 'outline'}
            onClick={() => setView('text')}
          >
            <IconFileText size={16} />
            Text
          </Button>
        </ButtonGroup>
      </div>

      {error && (
        <div className="px-5 mt-4">
          <Alert variant="destructive">
            <AlertTitle>The CSV is still not valid</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="px-5 my-5 min-w-0">
        {view === 'text' ? (
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            spellCheck={false}
            wrap="off"
            className="h-[420px] font-mono text-xs whitespace-pre overflow-auto"
            placeholder="date,description,amount"
          />
        ) : preview?.fileContent ? (
          // The wrapper owns both scroll axes; the Table's own container is
          // flattened so the sticky header keeps working while scrolling wide.
          <div className="h-[420px] w-full overflow-auto rounded-md border [&>[data-slot=table-container]]:overflow-visible">
            <Table className="w-max min-w-full text-xs">
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  {preview.fileContent.headers.map((header, index) => (
                    <TableHead key={index} className="whitespace-nowrap">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.fileContent.rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {preview.fileContent!.headers.map((_, cellIndex) => (
                      <TableCell
                        key={cellIndex}
                        className="whitespace-nowrap font-mono"
                      >
                        {row[cellIndex] ?? ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Alert variant="destructive" className="h-[420px]">
            <AlertTitle>Format incorrect. Cannot show as table.</AlertTitle>
            <AlertDescription>
              {preview?.error} Switch to the text view to fix the content.
            </AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          {view === 'table' && preview?.fileContent
            ? `${preview.fileContent.totalRows} row(s) across ${preview.fileContent.headers.length} column(s).`
            : `${content.split('\n').length} line(s). The first line is used as the column headers.`}
        </p>
      </div>

      <div className="mt-10 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onBack}>
          <IconArrowLeft size={16} />
          Back
        </Button>
        <Button
          size="sm"
          variant="default"
          onClick={handleValidate}
          disabled={!content.trim()}
        >
          Validate and map columns
          <IconArrowRight size={16} />
        </Button>
      </div>
    </>
  );
};
