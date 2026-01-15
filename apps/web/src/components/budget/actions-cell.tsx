'use client';

import { Button } from '@kanak/ui';
import { IconCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ActionsCellProps {
  categoryId: string;
  month: number;
  year: number;
  amount: number;
  token: string | null;
  onSaveSuccess?: (categoryId: string) => void;
}

export function ActionsCell({
  categoryId,
  month,
  year,
  amount,
  token,
  onSaveSuccess,
}: ActionsCellProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categoryId,
          month,
          year,
          amount,
        }),
      });

      if (response.ok) {
        toast.success('Budget saved successfully');
        onSaveSuccess?.(categoryId);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save budget');
      }
    } catch (error: any) {
      console.error('Error saving budget:', error);
      toast.error(error.message || 'Failed to save budget');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-end w-full">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSave}
        disabled={isSaving}
        className="flex items-center gap-2"
      >
        <IconCheck size={16} />
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}
