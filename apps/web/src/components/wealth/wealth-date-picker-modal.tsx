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
import { useState } from 'react';

interface WealthDatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDateSelect: (date: Date) => void;
}

export function WealthDatePickerModal({
  open,
  onOpenChange,
  onDateSelect,
}: WealthDatePickerModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const handleAdd = () => {
    if (selectedDate) {
      onDateSelect(selectedDate);
      setSelectedDate(undefined);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Date</DialogTitle>
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
            <Button type="button" onClick={handleAdd} disabled={!selectedDate}>
              Add Date
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
