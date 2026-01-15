'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kanak/ui';
import { IconX } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

interface SetupRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
}

type RuleFormData = {
  column: string;
  operation: string;
  value: string;
};

const columnOptions = [
  { label: 'Description', value: 'description' },
  { label: 'Amount', value: 'amount' },
  { label: 'Bank Account', value: 'bankAccount' },
  { label: 'Type', value: 'type' },
  { label: 'Reason', value: 'reason' },
];

const operationOptions = [
  { label: 'Contains', value: 'contains' },
  { label: 'Equals', value: 'equals' },
  { label: 'Starts with', value: 'startsWith' },
  { label: 'Ends with', value: 'endsWith' },
];

export function SetupRuleModal({
  open,
  onOpenChange,
  selectedText,
}: SetupRuleModalProps) {
  const form = useForm<RuleFormData>({
    defaultValues: {
      column: 'description',
      operation: 'contains',
      value: selectedText || '',
    },
  });

  // Update value when selectedText changes
  useEffect(() => {
    if (selectedText && open) {
      form.setValue('value', selectedText);
      form.setValue('column', 'description');
      form.setValue('operation', 'contains');
    }
  }, [selectedText, open, form]);

  const onSubmit = async (data: RuleFormData) => {
    try {
      // TODO: Implement rule creation API call
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error creating rule:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Set up Rule</DialogTitle>
          <DialogDescription>
            Create a rule to automatically categorize transactions based on
            conditions.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="column"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Column</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {columnOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="operation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operation</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select operation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {operationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter value"
                      {...field}
                      value={field.value || selectedText}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Create Rule</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
