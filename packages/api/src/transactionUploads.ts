import { getConvexClient } from './db';
import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';

// Helper to convert Convex upload to API format
function convertUploadFromConvex(upload: any): any {
  if (!upload) return null;
  return {
    id: upload._id,
    userId: upload.userId,
    fileName: upload.fileName,
    fileSize: upload.fileSize,
    totalRows: upload.totalRows,
    uploadedAt: new Date(upload.uploadedAt),
    createdAt: new Date(upload.createdAt),
    updatedAt: new Date(upload.updatedAt),
  };
}

export async function createTransactionUpload(
  userId: string,
  fileName: string,
  fileSize: number,
  totalRows: number
): Promise<any> {
  const convex = await getConvexClient();
  const upload = await convex.mutation(
    api.transactionUploads.createTransactionUpload,
    {
      userId: userId as Id<'users'>,
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
