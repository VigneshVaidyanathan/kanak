'use client';

import { api } from '@kanak/convex/src/_generated/api';
import { Button } from '@kanak/ui';
import { IconCheck } from '@tabler/icons-react';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ActionsCellProps {
  categoryId: string;
  month: number;
  year: number;
  amount: number;
  onSaveSuccess?: (categoryId: string) => void;
}

export function ActionsCell({
  categoryId,
  month,
  year,
  amount,
  onSaveSuccess,
}: ActionsCellProps) {
  const createOrUpdateBudget = useMutation(api.budgets.createOrUpdateBudget);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await createOrUpdateBudget({ categoryId, month, year, amount });
      toast.success('Budget saved successfully');
      onSaveSuccess?.(categoryId);
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
