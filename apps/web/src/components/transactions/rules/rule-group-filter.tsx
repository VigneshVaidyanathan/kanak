'use client';

import {
  Filter,
  FILTER_OPERATOR_OPTIONS,
  FilterComparisonOperator,
  GROUP_FILTER_OPERATOR_OPTIONS,
  GroupFilter,
  GroupFilterOperator,
  TRANSACTION_FILTERABLE_COLUMNS,
} from '@kanak/shared';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@kanak/ui';
import {
  IconChevronDown,
  IconCopyPlus,
  IconDots,
  IconPlus,
  IconSelector,
  IconTrash,
} from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RuleFilter } from './rule-filter';

interface RuleGroupFilterProps {
  filter: GroupFilter;
  onChange: (filter: GroupFilter) => void;
  level: number;
}

export function RuleGroupFilter({
  filter,
  onChange,
  level,
}: RuleGroupFilterProps) {
  const [localFilter, setLocalFilter] = useState<GroupFilter>(filter);
  const isInternalUpdateRef = useRef(false);

  // Sync local state when filter prop changes (but not when we're updating internally)
  useEffect(() => {
    if (!isInternalUpdateRef.current) {
      setLocalFilter(filter);
    }
    isInternalUpdateRef.current = false;
  }, [filter]);

  const getNewFilter = (): Filter => {
    return {
      field: TRANSACTION_FILTERABLE_COLUMNS[0].value,
      operator: FILTER_OPERATOR_OPTIONS[0].value as FilterComparisonOperator,
      value: '',
      id: uuidv4(),
    };
  };

  const hasNoFilter = useMemo(() => {
    return (
      (localFilter.filters ?? []).length === 0 &&
      (localFilter.groups ?? []).length === 0
    );
  }, [localFilter]);

  const addNewFilter = () => {
    const newFilter = {
      ...localFilter,
      filters: [...(localFilter.filters ?? []), getNewFilter()],
    };
    isInternalUpdateRef.current = true;
    setLocalFilter(newFilter);
    onChange(newFilter);
  };

  const addNewGroupFilter = () => {
    const newFilter = {
      ...localFilter,
      groups: [
        ...(localFilter.groups ?? []),
        {
          id: uuidv4(),
          operator: 'and' as GroupFilterOperator,
          filters: [getNewFilter()],
        },
      ],
    };
    isInternalUpdateRef.current = true;
    setLocalFilter(newFilter);
    onChange(newFilter);
  };

  const deleteGroup = (group: GroupFilter) => {
    const newFilter = {
      ...localFilter,
      groups: localFilter.groups?.filter((s) => s.id !== group.id),
    };
    isInternalUpdateRef.current = true;
    setLocalFilter(newFilter);
    onChange(newFilter);
  };

  const deleteFilter = (deleteFilter: Filter) => {
    const newFilter = {
      ...localFilter,
      filters: localFilter.filters?.filter((s) => s.id !== deleteFilter.id),
    };
    isInternalUpdateRef.current = true;
    setLocalFilter(newFilter);
    onChange(newFilter);
  };

  const FilterRightSection = ({ filter: dFilter }: { filter: Filter }) => {
    return (
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <IconDots size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter options</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                deleteFilter(dFilter);
              }}
              variant="destructive"
            >
              <IconTrash size={16} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const GroupRightSection = ({ group }: { group: GroupFilter }) => {
    return (
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <IconDots size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter options</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                deleteGroup(group);
              }}
              variant="destructive"
            >
              <IconTrash size={16} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  let filterCount = -1;

  const FilterLeftSection = ({ i }: { i: number }) => {
    return (
      <div className="flex text-sm w-[70px] justify-end">
        {i === 0 && <div className="font-semibold">Where</div>}
        {i === 1 && (
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="rounded border border-input bg-background px-3 py-1 text-sm cursor-pointer flex gap-2 items-center hover:bg-accent">
                  <div>
                    {
                      GROUP_FILTER_OPERATOR_OPTIONS.find(
                        (s) => s.value === localFilter.operator
                      )?.label
                    }
                  </div>
                  <div>
                    <IconSelector size={16} />
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {GROUP_FILTER_OPERATOR_OPTIONS.map((op, idx) => {
                  return (
                    <DropdownMenuItem
                      key={idx}
                      onClick={() => {
                        const newFilter = {
                          ...localFilter,
                          operator: op.value as GroupFilterOperator,
                        };
                        isInternalUpdateRef.current = true;
                        setLocalFilter(newFilter);
                        onChange(newFilter);
                      }}
                    >
                      {op.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {i > 1 && (
          <div>
            {
              GROUP_FILTER_OPERATOR_OPTIONS.find(
                (s) => s.value === localFilter.operator
              )?.label
            }
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2">
        {localFilter.filters?.map((f, i) => {
          ++filterCount;
          return (
            <div key={f.id} className="flex items-center gap-3 w-full">
              <FilterLeftSection i={filterCount} />
              <RuleFilter
                filter={f}
                onFilterChange={(updatedFilter) => {
                  const newFilters = localFilter.filters ?? [];
                  newFilters.splice(i, 1, updatedFilter);
                  const newFilter = {
                    ...localFilter,
                    filters: [...newFilters],
                  };
                  isInternalUpdateRef.current = true;
                  setLocalFilter(newFilter);
                  onChange(newFilter);
                }}
              />
              <FilterRightSection filter={f} />
            </div>
          );
        })}

        {localFilter.groups?.map((group, i) => {
          ++filterCount;
          return (
            <div key={group.id} className="flex items-start gap-3">
              <FilterLeftSection i={filterCount} />
              <div className="p-3 border rounded-md border-input flex-1">
                <RuleGroupFilter
                  level={level + 1}
                  filter={group}
                  onChange={(updatedGroup) => {
                    if (
                      (updatedGroup.filters ?? []).length === 0 &&
                      (updatedGroup.groups ?? []).length === 0
                    ) {
                      deleteGroup(group);
                    } else {
                      const newGroups = localFilter.groups ?? [];
                      newGroups.splice(i, 1, updatedGroup);
                      const newFilter = {
                        ...localFilter,
                        groups: [...newGroups],
                      };
                      isInternalUpdateRef.current = true;
                      setLocalFilter(newFilter);
                      onChange(newFilter);
                    }
                  }}
                />
              </div>
              <GroupRightSection group={group} />
            </div>
          );
        })}
      </div>
      {hasNoFilter && (
        <div className="w-full flex flex-col items-center justify-center p-3">
          <div className="mb-2 p-2 rounded-full bg-muted">
            <IconPlus size={22} />
          </div>
          <div className="text-sm font-semibold">
            Add your first filter rule or a group to filter transactions.
          </div>
          <div className="text-sm text-muted-foreground text-center w-2/3 mx-auto">
            You can add multiple individual filters or can add grouped filters
            which can contain filters within them to filter out the
            transactions.
          </div>
        </div>
      )}
      <div
        className={`mt-4 w-full flex ${
          hasNoFilter ? 'justify-center -mt-1' : 'justify-start'
        }`}
      >
        {level < 2 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={hasNoFilter ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
              >
                Add filter rule
                <IconChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={addNewFilter}>
                <IconPlus size={16} className="mr-2" />
                Add new filter rule
              </DropdownMenuItem>
              <DropdownMenuItem onClick={addNewGroupFilter}>
                <IconCopyPlus size={16} className="mr-2" />
                Add new group filter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {level === 2 && (
          <Button variant="outline" size="sm" onClick={addNewFilter}>
            <IconPlus size={16} className="mr-2" />
            Add filter rule
          </Button>
        )}
      </div>
    </div>
  );
}
