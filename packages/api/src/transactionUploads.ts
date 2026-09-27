import { getConvexClient } from './db';
import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';

// Helper to convert Convex upload to API format
function convertUploadFromConvex(upload: any): any {
  if (!upload) return null;
  return {
    id: upload._id,
    userId: upload.userId,
    storageId: upload.storageId,
    fileName: upload.fileName,
    fileSize: upload.fileSize,
    totalRows: upload.totalRows,
    uploadedAt: new Date(upload.uploadedAt),
    createdAt: new Date(upload.createdAt),
    updatedAt: new Date(upload.updatedAt),
  };
}

// Uploads the raw CSV to Convex file storage and returns its storage id.
async function storeCsvFile(
  convex: any,
  csvContent: string
): Promise<Id<'_storage'> | undefined> {
  try {
    const uploadUrl = await convex.mutation(
      api.transactionUploads.generateUploadUrl,
      {}
    );
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: csvContent,
    });
    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }
    const { storageId } = (await response.json()) as { storageId: string };
    return storageId as Id<'_storage'>;
  } catch (error) {
    // ponytail: storing the file is best-effort, never block the import
    console.error('Failed to store CSV in Convex storage:', error);
    return undefined;
  }
}

export async function createTransactionUpload(
  userId: string,
  fileName: string,
  fileSize: number,
  totalRows: number,
  csvContent?: string
): Promise<any> {
  const convex = await getConvexClient();
  const storageId = csvContent
    ? await storeCsvFile(convex, csvContent)
    : undefined;
  const upload = await convex.mutation(
    api.transactionUploads.createTransactionUpload,
    {
      userId: userId as Id<'users'>,
      storageId,
      fileName,
      fileSize,
      totalRows,
      uploadedAt: Date.now(),
    }
  );
  return convertUploadFromConvex(upload);
}

export async function getTransactionUploadsByUserId(
  userId: string
): Promise<any[]> {
  const convex = await getConvexClient();
  const uploads = await convex.query(
    api.transactionUploads.getTransactionUploadsByUserId,
    {
      userId: userId as Id<'users'>,
    }
  );
  return uploads.map(convertUploadFromConvex);
}
