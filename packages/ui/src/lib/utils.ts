import { type ClassValue, clsx } from 'clsx';
import * as React from 'react';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a hex color to rgba with specified opacity
 * @param hex - Color in hex format (e.g., '#FF5733' or 'FF5733')
 * @param opacity - Opacity value between 0 and 1, default 0.1
 * @returns rgba color string (e.g., 'rgba(255, 87, 51, 0.1)')
 */
export function hexToRgba(hex: string, opacity: number = 0.1): string {
  // Remove # if present
  const cleanedHex = hex.replace('#', '');

  // Parse hex color
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanedHex);
  if (!result) {
    // Return gray as fallback
    return `rgba(128, 128, 128, ${opacity})`;
  }

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Creates a linear gradient definition for charts
 * @param id - Unique identifier for the gradient
 * @param color - Color in hex format (e.g., '#000000')
 * @param startOpacity - Opacity at the start (top), default 0.8
 * @param endOpacity - Opacity at the end (bottom), default 0.1
 * @returns React element with linearGradient definition
 */
export function createLinearGradient(
  id: string,
  color: string,
  startOpacity: number = 0.8,
  endOpacity: number = 0.1
): React.ReactElement {
  return React.createElement(
    'linearGradient',
    { id, x1: '0', y1: '0', x2: '0', y2: '1' },
    React.createElement('stop', {
      offset: '5%',
      stopColor: color,
      stopOpacity: startOpacity,
    }),
    React.createElement('stop', {
      offset: '95%',
      stopColor: color,
      stopOpacity: endOpacity,
    })
  );
}
