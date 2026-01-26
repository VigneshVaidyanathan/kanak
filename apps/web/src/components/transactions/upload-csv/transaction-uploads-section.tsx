'use client';

import { useAuthStore } from '@/store/auth-store';
import { DataTable, DataTableColumnHeader } from '@kanak/components';
import { Badge, Spinner } from '@kanak/ui';
import { IconFileUpload } from '@tabler/icons-react';
import { ColumnDef } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type TransactionUpload = {
  id: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export function TransactionUploadsSection() {
  const { token } = useAuthStore();
  const [uploads, setUploads] = useState<TransactionUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const fetchUploads = useCallback(async () => {
    // Prevent duplicate calls (especially from React Strict Mode)
    if (fetchingRef.current) {
      return;
    }

    if (!token) {
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      const response = await fetch('/api/transactions/upload/list', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch uploads');
      }

      const data = await response.json();
      // Convert date strings to Date objects
      const uploadsWithDates = data.map((upload: any) => ({
        ...upload,
        uploadedAt: new Date(upload.uploadedAt),
        createdAt: new Date(upload.createdAt),
        updatedAt: new Date(upload.updatedAt),
      }));
      setUploads(uploadsWithDates);
    } catch (error) {
      console.error('Error fetching uploads:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [token]);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const columns = useMemo<ColumnDef<TransactionUpload>[]>(
    () => [
      {
        accessorKey: 'fileName',
        meta: {
          header: 'File Name',
        },
        size: 250,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="File Name" />
        ),
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2">
              <IconFileUpload size={16} className="text-muted-foreground" />
              <div className="text-sm font-medium">{row.original.fileName}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'fileSize',
        meta: {
          header: 'File Size',
        },
        size: 120,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="File Size" />
        ),
        cell: ({ row }) => {
          return (
            <div className="text-sm text-muted-foreground">
              {formatFileSize(row.original.fileSize)}
            </div>
          );
        },
      },
      {
        accessorKey: 'totalRows',
        meta: {
          header: 'Transactions Added',
        },
        size: 150,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Transactions Added" />
        ),
        cell: ({ row }) => {
          return (
            <Badge variant="outline" className="font-medium">
              {row.original.totalRows}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'uploadedAt',
        meta: {
          header: 'Uploaded At',
        },
        size: 200,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Uploaded At" />
        ),
        cell: ({ row }) => {
          return (
            <div className="text-sm text-muted-foreground">
              {formatDate(row.original.uploadedAt)}
            </div>
          );
        },
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Transaction Uploads</h3>
        <p className="text-sm text-muted-foreground">
          View all CSV file uploads and the transactions that were added to your
          system.
        </p>
      </div>

      {uploads.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/50">
          <IconFileUpload size={48} className="text-muted-foreground mb-4" />
          <p className="text-sm font-medium text-muted-foreground">
            No uploads yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload a CSV file to see it listed here
          </p>
        </div>
      ) : (
        <DataTable
          data={uploads}
          columns={columns}
          isLoading={false}
          pagination={true}
          showRefresh={false}
          searchPlaceholder="Search uploads..."
        />
      )}
    </div>
  );
}
