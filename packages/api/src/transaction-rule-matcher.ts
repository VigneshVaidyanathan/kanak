import {
  Filter,
  FilterComparisonOperator,
  FilterFieldType,
  GroupFilter,
  Transaction,
} from '@kanak/shared';

/**
 * Get the value of a field from a transaction
 */
function getTransactionFieldValue(
  transaction: Transaction,
  field: FilterFieldType
): string | number | Date | null | undefined {
  switch (field) {
    case 'date':
      return new Date(transaction.date);
    case 'amount':
      return Number(transaction.amount);
    case 'description':
      return transaction.description || '';
    case 'category':
      return transaction.category || '';
    case 'type':
      return transaction.type || '';
    case 'bankAccount':
      return transaction.bankAccount || '';
    default:
      return null;
  }
}

/**
 * Compare two values based on the operator
 */
function compareValues(
  transactionValue: string | number | Date | null | undefined,
  filterValue: string,
  operator: FilterComparisonOperator,
  fieldType: FilterFieldType
): boolean {
  // Handle null/undefined values
  if (transactionValue === null || transactionValue === undefined) {
    return operator === 'notEquals' || operator === 'equals';
  }

  // Convert filter value based on field type
  let filterValueConverted: string | number | Date;
  if (fieldType === 'date') {
    filterValueConverted = new Date(filterValue);
  } else if (fieldType === 'amount') {
    filterValueConverted = Number(filterValue);
  } else {
    filterValueConverted = filterValue;
  }

  // Convert transaction value to string for text comparisons
  const transactionValueStr =
    typeof transactionValue === 'string'
      ? transactionValue.toLowerCase()
      : transactionValue instanceof Date
        ? transactionValue.toISOString()
        : String(transactionValue).toLowerCase();

  const filterValueStr =
    typeof filterValueConverted === 'string'
      ? filterValueConverted.toLowerCase()
      : filterValueConverted instanceof Date
        ? filterValueConverted.toISOString()
        : String(filterValueConverted).toLowerCase();

  // Perform comparison based on operator
  switch (operator) {
    case 'contains':
      return transactionValueStr.includes(filterValueStr);
    case 'equals':
      if (fieldType === 'date') {
        return (
          transactionValue instanceof Date &&
          filterValueConverted instanceof Date &&
          transactionValue.toDateString() ===
            filterValueConverted.toDateString()
        );
      }
      if (fieldType === 'amount') {
        return (
          typeof transactionValue === 'number' &&
          typeof filterValueConverted === 'number' &&
          transactionValue === filterValueConverted
        );
      }
      return transactionValueStr === filterValueStr;
    case 'startsWith':
      return transactionValueStr.startsWith(filterValueStr);
    case 'endsWith':
      return transactionValueStr.endsWith(filterValueStr);
    case 'greaterThan':
      if (fieldType === 'date') {
        return (
          transactionValue instanceof Date &&
          filterValueConverted instanceof Date &&
          transactionValue > filterValueConverted
        );
      }
      if (fieldType === 'amount') {
        return (
          typeof transactionValue === 'number' &&
          typeof filterValueConverted === 'number' &&
          transactionValue > filterValueConverted
        );
      }
      return transactionValueStr > filterValueStr;
    case 'lessThan':
      if (fieldType === 'date') {
        return (
          transactionValue instanceof Date &&
          filterValueConverted instanceof Date &&
          transactionValue < filterValueConverted
        );
      }
      if (fieldType === 'amount') {
        return (
          typeof transactionValue === 'number' &&
          typeof filterValueConverted === 'number' &&
          transactionValue < filterValueConverted
        );
      }
      return transactionValueStr < filterValueStr;
    case 'greaterThanOrEqual':
      if (fieldType === 'date') {
        return (
          transactionValue instanceof Date &&
          filterValueConverted instanceof Date &&
          transactionValue >= filterValueConverted
        );
      }
      if (fieldType === 'amount') {
        return (
          typeof transactionValue === 'number' &&
          typeof filterValueConverted === 'number' &&
          transactionValue >= filterValueConverted
        );
      }
      return transactionValueStr >= filterValueStr;
    case 'lessThanOrEqual':
      if (fieldType === 'date') {
        return (
          transactionValue instanceof Date &&
          filterValueConverted instanceof Date &&
          transactionValue <= filterValueConverted
        );
      }
      if (fieldType === 'amount') {
        return (
          typeof transactionValue === 'number' &&
          typeof filterValueConverted === 'number' &&
          transactionValue <= filterValueConverted
        );
      }
      return transactionValueStr <= filterValueStr;
    case 'notEquals':
      if (fieldType === 'date') {
        return (
          transactionValue instanceof Date &&
          filterValueConverted instanceof Date &&
          transactionValue.toDateString() !==
            filterValueConverted.toDateString()
        );
      }
      if (fieldType === 'amount') {
        return (
          typeof transactionValue === 'number' &&
          typeof filterValueConverted === 'number' &&
          transactionValue !== filterValueConverted
        );
      }
      return transactionValueStr !== filterValueStr;
    default:
      return false;
  }
}

/**
 * Check if a transaction matches a single filter
 */
export function matchesFilter(
  transaction: Transaction,
  filter: Filter
): boolean {
  const field = filter.field as FilterFieldType;
  const transactionValue = getTransactionFieldValue(transaction, field);
  return compareValues(transactionValue, filter.value, filter.operator, field);
}

/**
 * Check if a transaction matches a group filter (recursive)
 */
export function matchesGroupFilter(
  transaction: Transaction,
  groupFilter: GroupFilter
): boolean {
  const { operator, filters, groups } = groupFilter;

  // If no filters and no groups, return false
  if ((!filters || filters.length === 0) && (!groups || groups.length === 0)) {
    return false;
  }

  // Evaluate filters
  const filterResults: boolean[] = [];
  if (filters && filters.length > 0) {
    filterResults.push(
      ...filters.map((filter) => matchesFilter(transaction, filter))
    );
  }

  // Evaluate nested groups recursively
  if (groups && groups.length > 0) {
    filterResults.push(
      ...groups.map((group) => matchesGroupFilter(transaction, group))
    );
  }

  // Apply operator logic
  if (operator === 'and') {
    return filterResults.every((result) => result === true);
  } else {
    // operator === 'or'
    return filterResults.some((result) => result === true);
  }
}
