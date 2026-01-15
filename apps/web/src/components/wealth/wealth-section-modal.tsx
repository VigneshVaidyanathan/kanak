'use client';

import { useAuthStore } from '@/store/auth-store';
import { ColorPicker, DEFAULT_COLORS } from '@kanak/components';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
  Switch,
} from '@kanak/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// Convert hex color to pastel version (very light)
function hexToPastel(hex: string, lightness: number = 0.9): string {
  // Remove # if present
  const cleanedHex = hex.replace('#', '');

  // Parse hex color
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanedHex);
  if (!result) return hex;

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  // Mix with white to create pastel (lightness controls how much white to mix)
  const pastelR = Math.round(r + (255 - r) * lightness);
  const pastelG = Math.round(g + (255 - g) * lightness);
  const pastelB = Math.round(b + (255 - b) * lightness);

  // Convert back to hex
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(pastelR)}${toHex(pastelG)}${toHex(pastelB)}`;
}

interface WealthSection {
  id: string;
  name: string;
  color?: string;
  operation?: 'add' | 'subtract';
  order: number;
}

interface WealthSectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: WealthSection | null;
  onSuccess: () => void;
}

export function WealthSectionModal({
  open,
  onOpenChange,
  section,
  onSuccess,
}: WealthSectionModalProps) {
  const { token } = useAuthStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#9E9E9E');
  const [operation, setOperation] = useState<'add' | 'subtract'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create pastel versions of default colors
  const pastelColors = useMemo(() => {
    return DEFAULT_COLORS.map((color) => hexToPastel(color, 0.85));
  }, []);

  useEffect(() => {
    if (section) {
      setName(section.name);
      setColor(section.color || '#9E9E9E');
      setOperation(section.operation || 'add');
    } else {
      setName('');
      setColor('#9E9E9E');
      setOperation('add');
    }
  }, [section, open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      if (!name.trim()) {
        toast.error('Section name is required');
        return;
      }

      setIsSubmitting(true);
      try {
        const url = section
          ? `/api/wealth/sections/${section.id}`
          : '/api/wealth/sections';
        const method = section ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            color: color,
            operation: operation,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save section');
        }

        toast.success(
          section
            ? 'Section updated successfully'
            : 'Section created successfully'
        );
        onSuccess();
        onOpenChange(false);
      } catch (error: any) {
        console.error('Error saving section:', error);
        toast.error(error.message || 'Failed to save section');
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, name, color, operation, section, onSuccess, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{section ? 'Edit Section' : 'Add Section'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel>Section Name</FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Savings, Deposits, Shares"
              required
            />
          </Field>
          <Field>
            <FieldLabel>Color</FieldLabel>
            <ColorPicker
              value={color}
              onValueChange={(value) => setColor(value || '#9E9E9E')}
              colors={pastelColors}
            />
          </Field>
          <Field>
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <FieldLabel>Operation</FieldLabel>
                <span className="text-sm text-muted-foreground">
                  {operation === 'add'
                    ? 'Will add section sum to total'
                    : 'Will reduce section sum from total'}
                </span>
              </div>
              <Switch
                checked={operation === 'add'}
                onCheckedChange={(checked) =>
                  setOperation(checked ? 'add' : 'subtract')
                }
              />
            </div>
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
              {isSubmitting ? 'Saving...' : section ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
