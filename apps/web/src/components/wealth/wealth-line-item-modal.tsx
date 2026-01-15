'use client';

import { useAuthStore } from '@/store/auth-store';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
} from '@kanak/ui';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface WealthLineItem {
  id: string;
  sectionId: string;
  name: string;
  order: number;
}

interface WealthLineItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItem: WealthLineItem | null;
  sectionId: string;
  onSuccess: () => void;
}

export function WealthLineItemModal({
  open,
  onOpenChange,
  lineItem,
  sectionId,
  onSuccess,
}: WealthLineItemModalProps) {
  const { token } = useAuthStore();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (lineItem) {
      setName(lineItem.name);
    } else {
      setName('');
    }
  }, [lineItem, open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      if (!name.trim()) {
        toast.error('Line item name is required');
        return;
      }

      if (!sectionId) {
        toast.error('Section is required');
        return;
      }

      setIsSubmitting(true);
      try {
        const url = lineItem
          ? `/api/wealth/line-items/${lineItem.id}`
          : '/api/wealth/line-items';
        const method = lineItem ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            sectionId: lineItem ? undefined : sectionId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save line item');
        }

        toast.success(
          lineItem
            ? 'Line item updated successfully'
            : 'Line item created successfully'
        );
        onSuccess();
        onOpenChange(false);
      } catch (error: any) {
        console.error('Error saving line item:', error);
        toast.error(error.message || 'Failed to save line item');
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, name, lineItem, sectionId, onSuccess, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {lineItem ? 'Edit Line Item' : 'Add Line Item'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel>Line Item Name</FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Bank Account 1, Savings Account"
              required
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : lineItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
