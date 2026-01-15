'use client';

import { useAuthStore } from '@/store/auth-store';
import { Icon } from '@kanak/components';
import { Category } from '@kanak/shared';
import {
  Badge,
  Button,
  Checkbox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Spinner,
} from '@kanak/ui';
import {
  IconEdit,
  IconPlus,
  IconSelect,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CategoryFormModal } from './category-form-modal';
import { DeleteCategoryModal } from './delete-category-modal';

const typeLabels: Record<string, string> = {
  income: 'Income',
  expense: 'Expense',
  'intra-transfer': 'Intra Transfer',
  'passive-savings': 'Passive Savings',
  savings: 'Savings',
};

const typeColors: Record<string, string> = {
  income: 'bg-green-500/10 text-green-600',
  expense: 'bg-red-500/10 text-red-600',
  'intra-transfer': 'bg-blue-500/10 text-blue-600',
  'passive-savings': 'bg-purple-500/10 text-purple-600',
  savings: 'bg-teal-500/10 text-teal-600',
};

const priorityLabels: Record<string, string> = {
  needs: 'Needs',
  wants: 'Wants',
  savings: 'Savings',
  insurance: 'Insurance',
  liabilities: 'Liabilities',
};

const priorityColors: Record<string, string> = {
  needs: 'bg-blue-500/10 text-blue-600',
  wants: 'bg-orange-500/10 text-orange-600',
  savings: 'bg-green-500/10 text-green-600',
  insurance: 'bg-purple-500/10 text-purple-600',
  liabilities: 'bg-red-500/10 text-red-600',
};

export function CategoriesSection() {
  const { token } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const fetchingRef = useRef(false);

  const fetchCategories = useCallback(async () => {
    // Prevent duplicate calls (especially from React Strict Mode)
    if (fetchingRef.current) {
      return;
    }

    if (!token) {
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      const response = await fetch('/api/categories', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch categories');
      }

      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [token]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAdd = () => {
    setSelectedCategory(null);
    setFormModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormModalOpen(true);
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setDeleteModalOpen(true);
  };

  const handleFormSuccess = () => {
    fetchCategories();
  };

  const handleDeleteSuccess = () => {
    fetchCategories();
  };

  // Filter categories based on selected filters
  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      // Type filter
      if (typeFilter.length > 0 && !typeFilter.includes(category.type)) {
        return false;
      }
      // Priority filter
      if (
        priorityFilter.length > 0 &&
        (!(category as any).priority ||
          !priorityFilter.includes((category as any).priority))
      ) {
        return false;
      }
      return true;
    });
  }, [categories, typeFilter, priorityFilter]);

  // Get unique types and priorities from categories
  const availableTypes = useMemo(() => {
    const types = new Set(categories.map((c) => c.type));
    return Array.from(types).map((type) => ({
      value: type,
      label: typeLabels[type] || type,
    }));
  }, [categories]);

  const availablePriorities = useMemo(() => {
    const priorities = new Set(
      categories
        .map((c) => (c as any).priority)
        .filter((p) => p !== null && p !== undefined)
    );
    return Array.from(priorities).map((priority) => ({
      value: priority,
      label: priorityLabels[priority] || priority,
    }));
  }, [categories]);

  const hasActiveFilters = typeFilter.length > 0 || priorityFilter.length > 0;

  const clearAllFilters = () => {
    setTypeFilter([]);
    setPriorityFilter([]);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-1">Categories</h3>
          <p className="text-sm text-muted-foreground">
            Manage your transaction categories here. Categories will be
            displayed here once defaults are configured.
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Categories</h3>
            <p className="text-sm text-muted-foreground">
              Manage your transaction categories here. Categories will be
              displayed here once defaults are configured.
            </p>
          </div>
          <Button onClick={handleAdd} size="sm">
            <IconPlus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        {/* Filters Section */}
        {(availableTypes.length > 0 || availablePriorities.length > 0) && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            {/* Type Filter */}
            {availableTypes.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <div className="border border-dashed rounded-md border-gray-300 h-[32px] flex items-center justify-center px-2 text-sm gap-2 hover:bg-gray-50 cursor-pointer bg-white">
                    <div className="flex items-center gap-1">
                      <IconSelect className="text-muted-foreground w-[16px]!" />
                      Type
                    </div>
                    {typeFilter.length > 0 && (
                      <div className="py-1 flex items-center gap-2 h-[28px]">
                        <Separator orientation="vertical" />
                        {typeFilter.length < 3 ? (
                          typeFilter.map((val) => {
                            const option = availableTypes.find(
                              (t) => t.value === val
                            );
                            return option ? (
                              <Badge
                                key={val}
                                variant="secondary"
                                className="bg-primary/10 text-primary"
                              >
                                {option.label}
                              </Badge>
                            ) : null;
                          })
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary"
                          >
                            {typeFilter.length} selected
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search types..."
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty>No types found.</CommandEmpty>
                      <CommandGroup>
                        {availableTypes.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={() => {
                              setTypeFilter((prev) =>
                                prev.includes(option.value)
                                  ? prev.filter((v) => v !== option.value)
                                  : [...prev, option.value]
                              );
                            }}
                          >
                            <Checkbox
                              checked={typeFilter.includes(option.value)}
                            />
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {typeFilter.length > 0 && (
                        <>
                          <Separator />
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setTypeFilter([]);
                              }}
                            >
                              <IconX />
                              <div>Clear filter</div>
                            </CommandItem>
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}

            {/* Priority Filter */}
            {availablePriorities.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <div className="border border-dashed rounded-md border-gray-300 h-[32px] flex items-center justify-center px-2 text-sm gap-2 hover:bg-gray-50 cursor-pointer bg-white">
                    <div className="flex items-center gap-1">
                      <IconSelect className="text-muted-foreground w-[16px]!" />
                      Priority
                    </div>
                    {priorityFilter.length > 0 && (
                      <div className="py-1 flex items-center gap-2 h-[28px]">
                        <Separator orientation="vertical" />
                        {priorityFilter.length < 3 ? (
                          priorityFilter.map((val) => {
                            const option = availablePriorities.find(
                              (p) => p.value === val
                            );
                            return option ? (
                              <Badge
                                key={val}
                                variant="secondary"
                                className="bg-primary/10 text-primary"
                              >
                                {option.label}
                              </Badge>
                            ) : null;
                          })
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary"
                          >
                            {priorityFilter.length} selected
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search priorities..."
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty>No priorities found.</CommandEmpty>
                      <CommandGroup>
                        {availablePriorities.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={() => {
                              setPriorityFilter((prev) =>
                                prev.includes(option.value)
                                  ? prev.filter((v) => v !== option.value)
                                  : [...prev, option.value]
                              );
                            }}
                          >
                            <Checkbox
                              checked={priorityFilter.includes(option.value)}
                            />
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {priorityFilter.length > 0 && (
                        <>
                          <Separator />
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setPriorityFilter([]);
                              }}
                            >
                              <IconX />
                              <div>Clear filter</div>
                            </CommandItem>
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}

            {/* Clear All Filters */}
            {hasActiveFilters && (
              <div
                className="border border-dashed rounded-md border-gray-300 h-[32px] flex items-center justify-center px-2 text-sm gap-2 hover:bg-gray-50 cursor-pointer"
                onClick={clearAllFilters}
              >
                <div className="flex items-center gap-1">
                  <IconX className="text-muted-foreground w-[16px]!" />
                  Clear all filters
                </div>
              </div>
            )}
          </div>
        )}

        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-4">
              No categories yet. Create your first category to get started.
            </p>
            <Button onClick={handleAdd} variant="outline">
              <IconPlus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-4">
              No categories match the selected filters.
            </p>
            <Button onClick={clearAllFilters} variant="outline">
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: category.color }}
                    >
                      <Icon
                        name={category.icon as any}
                        className="h-5 w-5 text-white"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">
                        {category.title}
                      </h4>
                      {category.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {category.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <Badge
                          className={
                            typeColors[category.type] ||
                            'bg-gray-500/10 text-gray-600'
                          }
                        >
                          {typeLabels[category.type] || category.type}
                        </Badge>
                        {(category as any).priority && (
                          <Badge
                            className={
                              priorityColors[(category as any).priority] ||
                              'bg-gray-500/10 text-gray-600'
                            }
                          >
                            {priorityLabels[(category as any).priority] ||
                              (category as any).priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleEdit(category)}
                      className="h-7 w-7"
                    >
                      <IconEdit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(category)}
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CategoryFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        category={selectedCategory || undefined}
        onSuccess={handleFormSuccess}
      />

      <DeleteCategoryModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        category={selectedCategory}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
