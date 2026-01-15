'use client';

import { useAuthStore } from '@/store/auth-store';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Spinner,
} from '@kanak/ui';
import { IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DeleteLineItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItem: { id: string; name: string } | null;
  onSuccess: () => void;
}

export function DeleteLineItemModal({
  open,
  onOpenChange,
  lineItem,
  onSuccess,
}: DeleteLineItemModalProps) {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!lineItem || !token) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/wealth/line-items/${lineItem.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete line item');
      }

      toast.success('Line item deleted successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting line item:', error);
      toast.error(error.message || 'Failed to delete line item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-destructive">
              Delete Line Item
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6"
              disabled={loading}
            >
              <IconX size={16} />
            </Button>
          </div>
          <DialogDescription>
            Are you sure you want to delete this line item? This action cannot
            be undone. All entries associated with this line item will also be
            deleted.
          </DialogDescription>
        </DialogHeader>

        {lineItem && (
          <div>
            <div className="bg-muted rounded-lg p-4">
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Line Item Name:
                  </span>
                  <p className="text-sm font-semibold">{lineItem.name}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner className="mr-2" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
