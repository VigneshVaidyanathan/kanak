'use client';

import {
  Button,
  Calendar,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Field,
  FieldLabel,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@kanak/ui';
import { CalendarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export type WealthDatePickerModalScope = 'add' | 'edit';

interface WealthDatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDateSelect: (date: Date) => void;
  scope?: WealthDatePickerModalScope;
  /** When scope is 'edit', the date being edited (UTC). */
  initialDate?: Date | null;
}

export function WealthDatePickerModal({
  open,
  onOpenChange,
  onDateSelect,
  scope = 'add',
  initialDate = null,
}: WealthDatePickerModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (open && scope === 'edit' && initialDate) {
      setSelectedDate(initialDate);
    } else if (open && scope === 'add') {
      setSelectedDate(undefined);
    }
  }, [open, scope, initialDate]);

  const handleSubmit = (): void => {
    if (selectedDate) {
      onDateSelect(selectedDate);
      setSelectedDate(undefined);
      onOpenChange(false);
    }
  };

  const isEdit = scope === 'edit';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Date' : 'Add Date'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel>Select Date</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon />
                  {selectedDate ? (
                    selectedDate.toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedDate(undefined);
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedDate}
            >
              {isEdit ? 'Save' : 'Add Date'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
