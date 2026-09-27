'use client';

import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
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
import { useMutation, useQuery } from 'convex/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DeleteTransactionRuleModal } from './delete-transaction-rule-modal';
import { TransactionRuleModal } from './transaction-rule-modal';

function countFilters(groupFilter: GroupFilter): number {
  return groupFilter.filters?.length || 0;
}

export function TransactionRulesSection() {
  const rulesResult = useQuery(
    api.transactionRules.getTransactionRulesByUserId,
    {}
  );
  const updateRulesOrder = useMutation(
    api.transactionRules.updateTransactionRulesOrder
  );
  // Drag-and-drop reorders locally for the duration of the drag; `pendingOrder`
  // holds that until the debounced save lands and the live query catches up.
  const [pendingOrder, setPendingOrder] = useState<TransactionRule[] | null>(
    null
  );
  const rules = useMemo(
    () => pendingOrder ?? ((rulesResult ?? []) as TransactionRule[]),
    [pendingOrder, rulesResult]
  );
  const loading = rulesResult === undefined;
  const categoriesResult = useQuery(api.categories.getCategoriesByUserId, {});
  const categories = useMemo(
    () => (categoriesResult ?? []) as Category[],
    [categoriesResult]
  );
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<TransactionRule | null>(
    null
  );
  const [draggedRuleId, setDraggedRuleId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    setPendingOrder(updatedRules);
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
    try {
      await updateRulesOrder({
        updates: orderedRules.map((rule, index) => ({
          id: rule.id as Id<'transaction_rules'>,
          order: index,
        })),
      });
      setPendingOrder(null);
      toast.success('Transaction rules order updated');
    } catch (error: any) {
      console.error('Error saving order:', error);
      toast.error(error.message || 'Failed to save order');
      // Drop the local order so the live query's version shows again.
      setPendingOrder(null);
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
      />

      <DeleteTransactionRuleModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        rule={selectedRule}
      />
    </>
  );
}
