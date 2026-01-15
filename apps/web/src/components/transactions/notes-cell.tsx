'use client';

import { Transaction } from '@kanak/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@kanak/ui';
import { IconPencil } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface NotesCellProps {
  transaction: Transaction;
  token: string | null;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
}

export function NotesCell({ transaction, token, onUpdate }: NotesCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState(transaction.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: notes || null }),
      });

      if (response.ok) {
        const updatedTransaction = await response.json();
        onUpdate(transaction.id, updatedTransaction);
        setIsOpen(false);
        toast.success('Notes updated successfully');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update notes');
      }
    } catch (error: any) {
      console.error('Error updating notes:', error);
      toast.error(error.message || 'Failed to update notes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpen = () => {
    setNotes(transaction.notes || '');
    setIsOpen(true);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      // Reset notes to original value when closing without saving
      setNotes(transaction.notes || '');
    }
    setIsOpen(open);
  };

  return (
    <>
      <div className="group relative flex items-center w-full">
        <div className="text-sm flex-1">{transaction.notes}</div>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleOpen}
          className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0"
          aria-label="Edit notes"
        >
          <IconPencil size={14} />
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
            <DialogDescription>
              Add or edit notes for this transaction
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes..."
              rows={6}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
