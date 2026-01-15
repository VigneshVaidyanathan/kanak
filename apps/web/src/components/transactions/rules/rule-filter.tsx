'use client';

import {
  Filter,
  FILTER_OPERATOR_OPTIONS,
  FilterComparisonOperator,
  FilterFieldTypeDef,
  TRANSACTION_FILTERABLE_COLUMNS,
} from '@kanak/shared';
import {
  Badge,
  Checkbox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kanak/ui';
import {
  IconCalendar,
  IconHash,
  IconLetterCase,
  IconSelector,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';

interface RuleFilterProps {
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
}

export function RuleFilter({ filter, onFilterChange }: RuleFilterProps) {
  const [localFilter, setLocalFilter] = useState<Filter>(filter);
  const [selectedFilterField, setSelectedFilterField] = useState<
    FilterFieldTypeDef | undefined
  >(
    TRANSACTION_FILTERABLE_COLUMNS.find(
      (s) => s.value === (filter.field as string)
    )
  );

  useEffect(() => {
    setLocalFilter(filter);
    setSelectedFilterField(
      TRANSACTION_FILTERABLE_COLUMNS.find(
        (s) => s.value === (filter.field as string)
      )
    );
  }, [filter]);

  const handleFilterChange = (updatedFilter: Filter) => {
    setLocalFilter(updatedFilter);
    setSelectedFilterField(
      TRANSACTION_FILTERABLE_COLUMNS.find(
        (s) => s.value === (updatedFilter.field as string)
      )
    );
    onFilterChange(updatedFilter);
  };

  const getFieldIcon = (type: 'date' | 'text' | 'number') => {
    switch (type) {
      case 'date':
        return <IconCalendar size={16} className="text-muted-foreground" />;
      case 'number':
        return <IconHash size={16} className="text-muted-foreground" />;
      case 'text':
        return <IconLetterCase size={16} className="text-muted-foreground" />;
      default:
        return null;
    }
  };

  // Get available operators based on field type
  const getAvailableOperators = () => {
    if (!selectedFilterField) return FILTER_OPERATOR_OPTIONS;

    if (
      selectedFilterField.type === 'number' ||
      selectedFilterField.type === 'date'
    ) {
      // Numeric/date fields: show all operators including comparison
      return FILTER_OPERATOR_OPTIONS;
    } else {
      // Text fields: exclude numeric comparison operators
      return FILTER_OPERATOR_OPTIONS.filter(
        (op) =>
          ![
            'greaterThan',
            'lessThan',
            'greaterThanOrEqual',
            'lessThanOrEqual',
          ].includes(op.value)
      );
    }
  };

  const isTransactionTypeField = selectedFilterField?.value === 'type';
  const selectedValues: ('credit' | 'debit')[] = isTransactionTypeField
    ? localFilter.value
      ? localFilter.value
          .split(',')
          .map((v) => v.trim().toLowerCase())
          .filter(
            (v): v is 'credit' | 'debit' => v === 'credit' || v === 'debit'
          )
      : []
    : [];

  const handleTransactionTypeChange = (value: string) => {
    const normalizedValue = value.toLowerCase().trim() as 'credit' | 'debit';
    let newValues: ('credit' | 'debit')[];
    if (selectedValues.includes(normalizedValue)) {
      // Remove the value
      newValues = selectedValues.filter((v) => v !== normalizedValue);
    } else {
      // Add the normalized value
      newValues = [...selectedValues, normalizedValue];
    }
    handleFilterChange({
      ...localFilter,
      value: newValues.join(','),
    });
  };

  return (
    <div className="flex items-center gap-3 flex-1">
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="rounded-md border border-input bg-background px-3 py-1.5 text-sm cursor-pointer flex gap-2 items-center hover:bg-accent">
              <div>
                {selectedFilterField && getFieldIcon(selectedFilterField.type)}
              </div>
              <div>{selectedFilterField?.label}</div>
              <div>
                <IconSelector size={16} />
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            <DropdownMenuLabel>Transaction fields</DropdownMenuLabel>
            {TRANSACTION_FILTERABLE_COLUMNS.map((field, i) => {
              return (
                <DropdownMenuItem
                  key={i}
                  onClick={() => {
                    const availableOps = TRANSACTION_FILTERABLE_COLUMNS.find(
                      (s) => s.value === field.value
                    );
                    const textOperators = [
                      'contains',
                      'equals',
                      'startsWith',
                      'endsWith',
                      'notEquals',
                    ];
                    const numericOperators = [
                      'equals',
                      'greaterThan',
                      'lessThan',
                      'greaterThanOrEqual',
                      'lessThanOrEqual',
                      'notEquals',
                    ];

                    // Reset operator if current operator is not valid for new field type
                    let newOperator = localFilter.operator;
                    if (
                      availableOps?.type === 'text' &&
                      !textOperators.includes(localFilter.operator)
                    ) {
                      newOperator = 'contains' as FilterComparisonOperator;
                    } else if (
                      (availableOps?.type === 'number' ||
                        availableOps?.type === 'date') &&
                      !numericOperators.includes(localFilter.operator)
                    ) {
                      newOperator = 'equals' as FilterComparisonOperator;
                    }

                    handleFilterChange({
                      ...localFilter,
                      field: field.value,
                      operator: newOperator,
                      // Reset value when changing field type (except for transaction type)
                      value: field.value === 'type' ? localFilter.value : '',
                    });
                  }}
                >
                  <div className="flex gap-2 items-center">
                    <div>{getFieldIcon(field.type)}</div>
                    <div>{field.label}</div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div>
        <Select
          value={localFilter.operator}
          onValueChange={(value) => {
            handleFilterChange({
              ...localFilter,
              operator: value as FilterComparisonOperator,
            });
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue>
              {
                getAvailableOperators().find(
                  (s) => s.value === localFilter.operator
                )?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {getAvailableOperators().map((op, i) => {
              return (
                <SelectItem key={i} value={op.value}>
                  {op.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        {isTransactionTypeField ? (
          <Popover>
            <PopoverTrigger asChild>
              <div className="rounded-md border border-input bg-background px-3 py-1.5 text-sm cursor-pointer flex gap-2 items-center hover:bg-accent min-w-[150px]">
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  {selectedValues.length > 0 ? (
                    selectedValues.map((val) => (
                      <Badge key={val} variant="secondary" className="text-xs">
                        {val === 'credit' ? 'Credit' : 'Debit'}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">
                      Select types...
                    </span>
                  )}
                </div>
                <IconSelector size={16} />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandList>
                  <CommandEmpty>No options found.</CommandEmpty>
                  <CommandGroup>
                    {(['credit', 'debit'] as const).map((type) => (
                      <CommandItem
                        key={type}
                        value={type}
                        onSelect={() => handleTransactionTypeChange(type)}
                      >
                        <Checkbox
                          checked={selectedValues.includes(type)}
                          className="mr-2"
                        />
                        {type === 'credit' ? 'Credit' : 'Debit'}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          <Input
            className="min-w-[100px]"
            placeholder="Value"
            type={selectedFilterField?.type === 'number' ? 'number' : 'text'}
            value={localFilter.value}
            onChange={(e) => {
              handleFilterChange({
                ...localFilter,
                value: e.target.value,
              });
            }}
          />
        )}
      </div>
    </div>
  );
}
