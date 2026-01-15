# Data Table Filter Types

## Overview

This document describes the type system for data table column filters.

## Types

### FilterOption

Used for combobox filter options:

```typescript
export type FilterOption = {
  label: string;
  value: boolean;
};
```

### ColumnFilter

A union type supporting multiple filter types:

```typescript
export type ColumnFilter = ComboboxFilter | RangeFilter;
```

#### ComboboxFilter

```typescript
type ComboboxFilter = {
  type: 'COMBOBOX';
  options: FilterOption[];
  text: string;
  placeholder: string;
};
```

#### RangeFilter

```typescript
type RangeFilter = {
  type: 'RANGE';
  text: string;
  placeholder: string;
  // Add range-specific properties as needed
};
```

## Usage Example

```typescript
import { FilterOption } from '@workspace/ui/custom/data-table/data-table-types';

const statusFilterOptions: FilterOption[] = [
  {
    label: 'Active',
    value: true,
  },
  {
    label: 'Inactive',
    value: false,
  },
];

// In column definition
{
  accessorKey: 'allowOrders',
  meta: {
    header: 'Status',
    filter: {
      type: 'COMBOBOX',
      options: statusFilterOptions,
      text: 'Status',
      placeholder: 'Filter by status...',
    },
  },
}
```

## Type Guards

The module exports type guard functions for runtime type checking:

- `isComboboxFilter(filter: ColumnFilter): filter is ComboboxFilter`
- `isRangeFilter(filter: ColumnFilter): filter is RangeFilter`

## Extending Filter Types

To add new filter types:

1. Define the new filter type in `data-table-types.ts`
2. Add it to the `ColumnFilter` union type
3. Create a type guard function for it
4. Update the data-table component to handle the new filter type
