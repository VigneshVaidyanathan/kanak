'use client';

import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
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
import { useMutation } from 'convex/react';
import { useState } from 'react';

interface DeleteCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: {
    id: string;
    title: string;
  } | null;
}

export function DeleteCategoryModal({
  open,
  onOpenChange,
  category,
}: DeleteCategoryModalProps) {
  const deactivateCategory = useMutation(api.categories.deactivateCategory);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!category) return;

    try {
      setLoading(true);
      await deactivateCategory({ id: category.id as Id<'categories'> });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting category:', error);
      alert(error.message || 'Failed to delete category');
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
              Deactivate Category
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
            This action cannot be undone. The category <b>{category?.title}</b>{' '}
            will be deactivated and will no longer appear in your categories
            list.
          </DialogDescription>
        </DialogHeader>

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
                Deactivating...
              </>
            ) : (
              'Deactivate'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
