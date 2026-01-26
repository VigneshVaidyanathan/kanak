import { create } from 'zustand';

export type FileContent = {
  headers: string[];
  totalRows: number;
  rows: string[][];
};

export type CsvColumnMapping = {
  property: {
    label: string;
    value: string;
    description?: string;
    isRequired: boolean;
  };
  header?: string;
  headerIndex?: number;
  selectedBankAccountId?: string; // For bank account selection
};

export type SampleTransaction = {
  date?: string;
  amount?: number;
  type?: 'credit' | 'debit';
  bankAccount?: string;
  description?: string;
  reason?: string;
  category?: string;
};

export type DateFormat =
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY-MM-DD'
  | 'DD-MM-YYYY'
  | 'MM-DD-YYYY'
  | 'DD.MM.YYYY'
  | 'YYYY/MM/DD'
  | 'auto';

interface CsvUploadState {
  activeStep: number;
  fileContent?: FileContent;
  columnMapping: CsvColumnMapping[];
  transactions: SampleTransaction[];
  csvData?: Record<string, string>[]; // Original CSV data with CSV column names as keys
  dateFormat: DateFormat;
  fileName?: string;
  fileSize?: number;
  setActiveStep: (step: number) => void;
  setFileContent: (fileContent?: FileContent) => void;
  setColumnMapping: (columnMapping: CsvColumnMapping[]) => void;
  setTransactions: (transactions: SampleTransaction[]) => void;
  setCsvData: (csvData?: Record<string, string>[]) => void;
  setDateFormat: (format: DateFormat) => void;
  setFileName: (fileName?: string) => void;
  setFileSize: (fileSize?: number) => void;
  reset: () => void;
}

const initialState: Pick<
  CsvUploadState,
  | 'activeStep'
  | 'columnMapping'
  | 'transactions'
  | 'csvData'
  | 'dateFormat'
  | 'fileName'
  | 'fileSize'
> = {
  activeStep: 0,
  columnMapping: [],
  transactions: [],
  csvData: undefined,
  dateFormat: 'DD/MM/YYYY',
  fileName: undefined,
  fileSize: undefined,
};

export const useCsvUploadStore = create<CsvUploadState>((set) => ({
  ...initialState,
  setActiveStep: (step) => set({ activeStep: step }),
  setFileContent: (fileContent) => set({ fileContent }),
  setColumnMapping: (columnMapping) => set({ columnMapping }),
  setTransactions: (transactions) => set({ transactions }),
  setCsvData: (csvData) => set({ csvData }),
  setDateFormat: (dateFormat) => set({ dateFormat }),
  setFileName: (fileName) => set({ fileName }),
  setFileSize: (fileSize) => set({ fileSize }),
  reset: () => set(initialState),
}));
