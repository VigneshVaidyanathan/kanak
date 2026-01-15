import { z } from 'zod';

export const csvColumnMappingSchema = z.object({
  date: z.string().min(1, 'Date column mapping is required'),
  amount: z.string().min(1, 'Amount column mapping is required'),
  type: z.string().min(1, 'Type column mapping is required'),
  bankAccount: z.string().min(1, 'Bank account column mapping is required'),
  description: z.string().min(1, 'Description column mapping is required'),
  reason: z.string().min(1, 'Reason column mapping is required'),
  category: z.string().optional(),
});

export type CsvColumnMapping = z.infer<typeof csvColumnMappingSchema>;

export const csvUploadProcessSchema = z.object({
  csvData: z.array(z.record(z.string())),
  mapping: csvColumnMappingSchema,
});

export type CsvUploadProcessInput = z.infer<typeof csvUploadProcessSchema>;
