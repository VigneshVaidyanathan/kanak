'use client';

import { useAuthStore } from '@/store/auth-store';
import {
  ColorPicker,
  FormInput,
  FormSelect,
  FormTextarea,
  IconPicker,
} from '@kanak/components';
import {
  CreateCategoryInput,
  createCategorySchema,
  updateCategorySchema,
} from '@kanak/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Form,
  Spinner,
} from '@kanak/ui';
import { IconX } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: {
    id: string;
    title: string;
    color: string;
    icon: string;
    description?: string;
    type: string;
    priority?: string;
  };
  onSuccess: () => void;
}

type CategoryFormData = CreateCategoryInput;

const categoryTypeOptions = [
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
  { label: 'Intra Transfer', value: 'intra-transfer' },
  { label: 'Passive Savings', value: 'passive-savings' },
  { label: 'Savings', value: 'savings' },
];

const categoryPriorityOptions = [
  { label: 'Needs', value: 'needs' },
  { label: 'Wants', value: 'wants' },
  { label: 'Savings', value: 'savings' },
  { label: 'Insurance', value: 'insurance' },
  { label: 'Liabilities', value: 'liabilities' },
];

export function CategoryFormModal({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryFormModalProps) {
  const { token } = useAuthStore();
  const isEditing = !!category;

  const form = useForm<CategoryFormData>({
    defaultValues: {
      title: '',
      color: '#9E9E9E',
      icon: '',
      description: '',
      type: 'expense',
      priority: undefined,
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        title: category.title,
        color: category.color,
        icon: category.icon as any,
        description: category.description || '',
        type: category.type as any,
        priority: category.priority as any,
      });
    } else {
      form.reset({
        title: '',
        color: '#9E9E9E',
        icon: '',
        description: '',
        type: 'expense',
        priority: undefined,
      });
    }
  }, [category, open, form]);

  const onSubmit = async (data: CategoryFormData) => {
    try {
      // Validate with zod schema
      const schema = isEditing ? updateCategorySchema : createCategorySchema;
      const validatedData = schema.parse(data);

      const url = category
        ? `/api/categories/${category.id}`
        : '/api/categories';
      const method = category ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save category');
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Error saving category:', error);
      if (error.errors) {
        // Zod validation errors
        const errorMessages = error.errors
          .map((e: any) => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
        alert(`Validation error: ${errorMessages}`);
      } else {
        alert(error.message || 'Failed to save category');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              {isEditing ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6"
            >
              <IconX size={16} />
            </Button>
          </div>
          <DialogDescription>
            {isEditing
              ? 'Update the category details below.'
              : 'Fill in the details to create a new category.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormInput
              control={form.control}
              name="title"
              label="Title"
              placeholder="Enter category title"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Color</label>
                <ColorPicker
                  value={form.watch('color')}
                  onValueChange={(value) => form.setValue('color', value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Icon</label>
                <IconPicker
                  value={form.watch('icon') as any}
                  onValueChange={(value) => form.setValue('icon', value)}
                  triggerPlaceholder="Select an icon"
                />
              </div>
            </div>

            <FormSelect
              control={form.control}
              name="type"
              label="Type"
              placeholder="Select category type"
              options={categoryTypeOptions}
            />

            <FormSelect
              control={form.control}
              name="priority"
              label="Priority"
              placeholder="Select priority (optional)"
              options={categoryPriorityOptions}
              clearable={true}
            />

            <FormTextarea
              control={form.control}
              name="description"
              label="Description"
              placeholder="Enter category description (optional)"
              rows={3}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Spinner className="mr-2" />
                    Saving...
                  </>
                ) : isEditing ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
