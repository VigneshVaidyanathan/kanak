'use client';

import { useAuthStore } from '@/store/auth-store';
import {
  Category,
  GroupFilter,
  TransactionRule,
  TransactionRuleAction,
} from '@kanak/shared';
import { Button, Spinner } from '@kanak/ui';
import {
  IconEdit,
  IconGripVertical,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DeleteTransactionRuleModal } from './delete-transaction-rule-modal';
import { TransactionRuleModal } from './transaction-rule-modal';

function countFilters(groupFilter: GroupFilter): number {
  return groupFilter.filters?.length || 0;
}

export function TransactionRulesSection() {
  const { token } = useAuthStore();
  const [rules, setRules] = useState<TransactionRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<TransactionRule | null>(
    null
  );
  const [draggedRuleId, setDraggedRuleId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const fetchingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRules = useCallback(async () => {
    if (fetchingRef.current) {
      return;
    }

    if (!token) {
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      const response = await fetch('/api/transaction-rules', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch transaction rules');
      }

      const data = await response.json();
      setRules(data);
    } catch (error) {
      console.error('Error fetching transaction rules:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [token]);

  const fetchCategories = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
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
    }
  }, [token]);

  useEffect(() => {
    fetchRules();
    fetchCategories();
  }, [fetchRules, fetchCategories]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleAdd = () => {
    setSelectedRule(null);
    setFormModalOpen(true);
  };

  const handleEdit = (rule: TransactionRule) => {
    setSelectedRule(rule);
    setFormModalOpen(true);
  };

  const handleDelete = (rule: TransactionRule) => {
    setSelectedRule(rule);
    setDeleteModalOpen(true);
  };

  const handleFormSuccess = () => {
    fetchRules();
  };

  const handleDeleteSuccess = () => {
    fetchRules();
  };

  const handleDragStart = (e: React.DragEvent, ruleId: string) => {
    setDraggedRuleId(ruleId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', ruleId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedRuleId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetRuleId: string) => {
    e.preventDefault();
    if (!draggedRuleId || draggedRuleId === targetRuleId) {
      return;
    }

    const draggedIndex = rules.findIndex((r) => r.id === draggedRuleId);
    const targetIndex = rules.findIndex((r) => r.id === targetRuleId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    const newRules = [...rules];
    const [draggedRule] = newRules.splice(draggedIndex, 1);
    newRules.splice(targetIndex, 0, draggedRule);

    // Update order values
    const updatedRules = newRules.map((rule, index) => ({
      ...rule,
      order: index,
    }));

    setRules(updatedRules);
    setIsReordering(true);

    // Debounce the save operation
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await saveOrder(updatedRules);
      setIsReordering(false);
    }, 500);
  };

  const saveOrder = async (orderedRules: TransactionRule[]) => {
    if (!token) return;

    try {
      const updates = orderedRules.map((rule, index) => ({
        id: rule.id,
        order: index,
      }));

      const response = await fetch('/api/transaction-rules/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save order');
      }

      const updatedRules = await response.json();
      setRules(updatedRules);
      toast.success('Transaction rules order updated');
    } catch (error: any) {
      console.error('Error saving order:', error);
      toast.error(error.message || 'Failed to save order');
      // Revert to original order on error
      fetchRules();
    }
  };

  const getCategoryName = (categoryId?: string): string => {
    if (!categoryId) return '-';
    const category = categories.find((c) => c.id === categoryId);
    return category?.title || '-';
  };

  const getIsInternalDisplay = (action: TransactionRuleAction): string => {
    if (action.isInternal === 'yes') return 'Yes';
    if (action.isInternal === 'no') return 'No';
    return '-';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-1">Transaction Rules</h3>
          <p className="text-sm text-muted-foreground">
            Manage your transaction rules here. Rules will be displayed here
            once created.
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
            <h3 className="text-lg font-semibold mb-1">Transaction Rules</h3>
            <p className="text-sm text-muted-foreground">
              Manage your transaction rules here. Rules will be displayed here
              once created.
            </p>
          </div>
          <Button onClick={handleAdd} size="sm">
            <IconPlus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        </div>

        {rules.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-4">
              No transaction rules yet. Create your first rule to get started.
            </p>
            <Button onClick={handleAdd} variant="outline">
              <IconPlus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header row */}
            <div className="flex items-center gap-3 pb-2 mb-2">
              <div className="shrink-0 w-5"></div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-center">
                <div className="text-sm font-semibold text-muted-foreground">
                  Title
                </div>
                <div className="text-sm font-semibold text-muted-foreground">
                  Number of Conditions
                </div>
                <div className="text-sm font-semibold text-muted-foreground">
                  Category
                </div>
                <div className="text-sm font-semibold text-muted-foreground">
                  Is Internal Transaction
                </div>
              </div>
              <div className="shrink-0 w-[72px] text-right">
                <div className="text-sm font-semibold text-muted-foreground">
                  Actions
                </div>
              </div>
            </div>
            {rules.map((rule) => {
              const filter = rule.filter as unknown as GroupFilter;
              const action = rule.action as unknown as TransactionRuleAction;
              const isDragging = draggedRuleId === rule.id;

              return (
                <div
                  key={rule.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, rule.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, rule.id)}
                  className={`flex items-center gap-3 border border-gray-200 rounded-lg p-2 py-1 bg-white hover:border-primary transition-all ${
                    isDragging ? 'opacity-50' : ''
                  }`}
                >
                  <div
                    className="cursor-grab active:cursor-grabbing shrink-0"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <IconGripVertical className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-center">
                    <div className="font-medium">{rule.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {countFilters(filter)} conditions
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getCategoryName(action.category)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getIsInternalDisplay(action)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleEdit(rule)}
                      className="h-7 w-7"
                    >
                      <IconEdit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(rule)}
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {isReordering && (
              <div className="text-sm text-muted-foreground text-center py-2">
                Saving order...
              </div>
            )}
          </div>
        )}
      </div>

      <TransactionRuleModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        rule={selectedRule || undefined}
        categories={categories}
        onSuccess={handleFormSuccess}
      />

      <DeleteTransactionRuleModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        rule={selectedRule}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
