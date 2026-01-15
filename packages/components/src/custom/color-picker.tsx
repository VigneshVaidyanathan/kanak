'use client';

import { Button, Popover, PopoverContent, PopoverTrigger, cn } from '@kanak/ui';
import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';
import { useState } from 'react';

// Default colors sorted by hue (grays first for non-started states, then chromatic colors)
export const DEFAULT_COLORS = [
  // Grays (for non-started/inactive states)
  '#9E9E9E', // Gray
  '#757575', // Medium Gray
  '#616161', // Dark Gray
  '#424242', // Charcoal Gray

  // Chromatic colors sorted by hue
  '#FF5252', // Bright Red
  '#FF5722', // Bright Deep Orange
  '#FF6B35', // Bright Orange
  '#FFA500', // Bright Orange-Yellow
  '#FFD700', // Bright Gold
  '#9CFF57', // Bright Lime
  '#4CAF50', // Bright Green
  '#00E5A0', // Bright Teal
  '#00BCD4', // Bright Cyan
  '#2196F3', // Bright Blue
  '#3D5AFE', // Bright Indigo
  '#7C4DFF', // Bright Purple
  '#9C27B0', // Bright Violet
  '#E91E63', // Bright Pink
  '#FF4081', // Bright Hot Pink
] as const;

export type ColorValue = string;

interface ColorPickerProps {
  value?: ColorValue;
  onValueChange?: (value: ColorValue) => void;
  colors?: readonly ColorValue[];
  disabled?: boolean;
}

export const ColorPicker = React.forwardRef<
  HTMLButtonElement,
  ColorPickerProps
>(
  (
    { value, onValueChange, colors = DEFAULT_COLORS, disabled = false },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleColorSelect = (color: ColorValue) => {
      onValueChange?.(color);
      setIsOpen(false);
    };

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            className="w-full justify-between"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              {value ? (
                <>
                  <div
                    className="w-4 h-4 rounded border border-border"
                    style={{ backgroundColor: value }}
                  />
                  <span>{value}</span>
                </>
              ) : (
                <span>Choose color</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="flex flex-row flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  'w-[30px] h-[30px] rounded-full relative cursor-pointer',
                  'flex items-center justify-center'
                )}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
              >
                {value === color && (
                  <Check size={14} className="text-white" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

ColorPicker.displayName = 'ColorPicker';
