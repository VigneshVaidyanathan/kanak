'use client';

import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
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
import { useMutation } from 'convex/react';
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
}

export function WealthLineItemModal({
  open,
  onOpenChange,
  lineItem,
  sectionId,
}: WealthLineItemModalProps) {
  const createWealthLineItem = useMutation(api.wealth.createWealthLineItem);
  const updateWealthLineItem = useMutation(api.wealth.updateWealthLineItem);
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
        if (lineItem) {
          await updateWealthLineItem({
            id: lineItem.id as Id<'wealth_line_items'>,
            name: name.trim(),
          });
        } else {
          await createWealthLineItem({
            sectionId: sectionId as Id<'wealth_sections'>,
            name: name.trim(),
          });
        }

        toast.success(
          lineItem
            ? 'Line item updated successfully'
            : 'Line item created successfully'
        );
        onOpenChange(false);
      } catch (error: any) {
        console.error('Error saving line item:', error);
        toast.error(error.message || 'Failed to save line item');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      name,
      lineItem,
      sectionId,
      createWealthLineItem,
      updateWealthLineItem,
      onOpenChange,
    ]
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
