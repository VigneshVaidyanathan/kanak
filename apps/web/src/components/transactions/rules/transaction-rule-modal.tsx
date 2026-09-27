'use client';

import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import {
  Category,
  Filter,
  GroupFilter,
  TransactionRule,
  TransactionRuleAction,
} from '@kanak/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@kanak/ui';
import { useMutation } from 'convex/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { RuleGroupFilter } from './rule-group-filter';
import { TransactionAction } from './transaction-action';

interface TransactionRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText?: string;
  transactionType?: 'credit' | 'debit';
  rule?: TransactionRule;
  categories: Category[];
  onSuccess?: () => void;
}

const getInitialFilter = (selectedText?: string): GroupFilter => {
  const filters: Filter[] = [];

  if (selectedText) {
    filters.push({
      id: uuidv4(),
      field: 'description',
      operator: 'contains',
      value: selectedText,
    });
  }

  return {
    id: uuidv4(),
    operator: 'and',
    filters: filters.length > 0 ? filters : undefined,
  };
};

const getInitialAction = (): TransactionRuleAction => {
  return {
    category: undefined,
    isInternal: undefined,
    notes: '',
    tags: [],
  };
};

export function TransactionRuleModal({
  open,
  onOpenChange,
  selectedText,
  transactionType,
  rule,
  categories,
  onSuccess,
}: TransactionRuleModalProps) {
  const createTransactionRule = useMutation(
    api.transactionRules.createTransactionRule
  );
  const updateTransactionRule = useMutation(
    api.transactionRules.updateTransactionRule
  );
  const applyRules = useMutation(api.transactions.applyRules);

  const saveRule = async () => {
    if (rule) {
      return await updateTransactionRule({
        id: rule.id as Id<'transaction_rules'>,
        title,
        filter,
        action,
      });
    }
    return await createTransactionRule({ title, filter, action });
  };
  const [title, setTitle] = useState(rule?.title || '');
  const [filter, setFilter] = useState<GroupFilter>(() => {
    if (rule?.filter) {
      const ruleFilter = rule.filter as unknown as GroupFilter;
      // If we're editing an existing rule and have selectedText/transactionType,
      // merge them into the existing filter
      if (selectedText || transactionType) {
        const existingFilters = ruleFilter.filters || [];
        const newFilters: Filter[] = [...existingFilters];

        if (selectedText) {
          newFilters.push({
            id: uuidv4(),
            field: 'description',
            operator: 'contains',
            value: selectedText,
          });
        }

        if (transactionType) {
          newFilters.push({
            id: uuidv4(),
            field: 'type',
            operator: 'contains',
            value: transactionType,
          });
        }

        return {
          ...ruleFilter,
          filters: newFilters,
        };
      }
      return ruleFilter;
    }
    return getInitialFilter(selectedText);
  });
  const [action, setAction] = useState<TransactionRuleAction>(
    rule?.action
      ? (rule.action as unknown as TransactionRuleAction)
      : getInitialAction()
  );
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  // Reset form when modal opens/closes or props change
  useEffect(() => {
    if (open) {
      if (rule) {
        setTitle(rule.title);
        const ruleFilter = rule.filter as unknown as GroupFilter;
        // If we're editing an existing rule and have selectedText/transactionType,
        // merge them into the existing filter
        if (selectedText || transactionType) {
          const existingFilters = ruleFilter.filters || [];
          const newFilters: Filter[] = [...existingFilters];

          if (selectedText) {
            newFilters.push({
              id: uuidv4(),
              field: 'description',
              operator: 'contains',
              value: selectedText,
            });
          }

          if (transactionType) {
            newFilters.push({
              id: uuidv4(),
              field: 'type',
              operator: 'contains',
              value: transactionType,
            });
          }

          setFilter({
            ...ruleFilter,
            filters: newFilters,
          });
        } else {
          setFilter(ruleFilter);
        }
        setAction(rule.action as unknown as TransactionRuleAction);
      } else {
        setTitle('');
        setFilter(getInitialFilter(selectedText));
        setAction(getInitialAction());
      }
    }
  }, [open, rule, selectedText, transactionType]);

  const hasFilter = useMemo(() => {
    return (
      (filter.filters ?? []).length > 0 || (filter.groups ?? []).length > 0
    );
  }, [filter]);

  const canSave = useMemo(() => {
    if (title.length === 0) {
      return false;
    }

    if (!hasFilter) {
      return false;
    }

    if (
      !action.category &&
      !action.isInternal &&
      !action.notes &&
      (action.tags?.length ?? 0) === 0
    ) {
      return false;
    }

    return true;
  }, [title, hasFilter, action]);

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    setLoading(true);
    try {
      await saveRule();

      toast.success(
        rule ? 'Rule updated successfully' : 'Rule created successfully'
      );
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      if (!rule) {
        setTitle('');
        setFilter(getInitialFilter());
        setAction(getInitialAction());
      }
    } catch (error: any) {
      console.error('Error saving rule:', error);
      toast.error(error.message || 'Failed to save rule');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndRun = async () => {
    if (!canSave) {
      return;
    }

    setLoading(true);
    setRunning(true);
    try {
      const savedRule = await saveRule();
      const ruleId = savedRule.id ?? rule?.id;

      if (!ruleId) {
        throw new Error('Failed to get rule ID after saving');
      }

      // Then apply just this rule, across every transaction.
      const result = await applyRules({
        ruleId: ruleId as Id<'transaction_rules'>,
      });

      toast.success(
        `Rule ${rule ? 'updated' : 'created'} and applied successfully! Updated ${result.updated} transaction(s).`
      );
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      if (!rule) {
        setTitle('');
        setFilter(getInitialFilter());
        setAction(getInitialAction());
      }
    } catch (error: any) {
      console.error('Error saving and running rule:', error);
      toast.error(error.message || 'Failed to save and run rule');
    } finally {
      setLoading(false);
      setRunning(false);
    }
  };

  const handleClose = () => {
    if (!rule) {
      // Reset form for new rules
      setTitle('');
      setFilter(getInitialFilter(selectedText));
      setAction(getInitialAction());
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Transaction rule settings
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {rule
              ? 'Edit the rule settings below. For all transactions that satisfy these sets of conditions you can define actions that can set predefined categories.'
              : 'Create a new rule. For all transactions that satisfy these sets of conditions you can define actions that can set predefined categories.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 mt-4">
          <div>
            <Label htmlFor="rule-name" className="text-base font-bold">
              Rule name
            </Label>
            <Input
              id="rule-name"
              placeholder="Enter a rule name here"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter a understandable name for this rule.
            </p>
          </div>

          <div>
            <div className="text-base font-bold">Conditions</div>
            <div className="text-sm text-muted-foreground mt-1">
              You can set multiple filters as conditions. You can also add
              nested grouped filters and we allow only 2 levels of nested
              grouped filters.
            </div>

            <div className="px-3 mt-3">
              <RuleGroupFilter
                level={0}
                onChange={(updatedFilter) => {
                  setFilter(updatedFilter);
                }}
                filter={filter}
              />
            </div>
          </div>

          <div>
            <div className="text-base font-bold">Actions</div>
            <div className="text-sm text-muted-foreground mt-1">
              Choose what needs to be done when a transaction matches the above
              filters. You can set few properties of those transactions.
            </div>

            <div className="p-3 px-5 mt-3 flex justify-center">
              <TransactionAction
                hasFilter={hasFilter}
                action={action}
                onChange={(updatedAction) => {
                  setAction(updatedAction);
                }}
                categories={categories}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end items-center gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading || running}
            >
              Cancel
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSaveAndRun}
                  disabled={!canSave || loading || running}
                  variant="default"
                  className="gap-2"
                >
                  {running ? (
                    <>
                      <Spinner className="mr-2" />
                      Running...
                    </>
                  ) : loading ? (
                    <>
                      <Spinner className="mr-2" />
                      {rule ? 'Updating...' : 'Adding...'}
                    </>
                  ) : rule ? (
                    'Update and run rule'
                  ) : (
                    'Add and run rule'
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Add and run this rule for all transactions
              </TooltipContent>
            </Tooltip>
            <Button
              onClick={handleSave}
              disabled={!canSave || loading || running}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2" />
                  {rule ? 'Updating...' : 'Adding...'}
                </>
              ) : rule ? (
                'Update rule'
              ) : (
                'Add rule'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
