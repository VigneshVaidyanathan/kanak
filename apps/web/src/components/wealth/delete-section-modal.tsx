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
import { toast } from 'sonner';

interface DeleteSectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: { id: string; name: string; lineItemCount: number } | null;
}

export function DeleteSectionModal({
  open,
  onOpenChange,
  section,
}: DeleteSectionModalProps) {
  const softDeleteWealthSection = useMutation(
    api.wealth.softDeleteWealthSection
  );
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!section) return;

    try {
      setLoading(true);
      await softDeleteWealthSection({
        id: section.id as Id<'wealth_sections'>,
      });

      toast.success('Section deleted successfully');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting section:', error);
      toast.error(error.message || 'Failed to delete section');
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
              Delete Section
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
            Are you sure you want to delete this section? This action cannot be
            undone. All line items and entries associated with this section will
            also be deleted.
          </DialogDescription>
        </DialogHeader>

        {section && (
          <div>
            <div className="bg-muted rounded-lg p-4">
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Section Name:
                  </span>
                  <p className="text-sm font-semibold">{section.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Line Items:
                  </span>
                  <p className="text-sm font-semibold">
                    {section.lineItemCount}{' '}
                    {section.lineItemCount === 1 ? 'item' : 'items'}
                  </p>
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
