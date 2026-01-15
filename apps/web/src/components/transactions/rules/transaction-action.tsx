'use client';

import { Category, TransactionRuleAction } from '@kanak/shared';
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kanak/ui';
import { IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { CategoryCombobox } from '../category-combobox';

interface TransactionActionProps {
  action: TransactionRuleAction;
  hasFilter?: boolean;
  onChange: (action: TransactionRuleAction) => void;
  categories: Category[];
}

export function TransactionAction({
  action,
  hasFilter,
  onChange,
  categories,
}: TransactionActionProps) {
  const [localAction, setLocalAction] = useState<TransactionRuleAction>(action);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setLocalAction(action);
  }, [action]);

  const handleActionChange = (updatedAction: TransactionRuleAction) => {
    setLocalAction(updatedAction);
    onChange(updatedAction);
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !localAction.tags?.includes(trimmedTag)) {
      handleActionChange({
        ...localAction,
        tags: [...(localAction.tags || []), trimmedTag],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleActionChange({
      ...localAction,
      tags: localAction.tags?.filter((tag) => tag !== tagToRemove) || [],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!hasFilter) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-3">
        <div className="text-sm font-semibold">
          Add your first filter rule or a group to setup actions for them.
        </div>
        <div className="text-sm text-muted-foreground text-center w-2/3 mx-auto">
          Once you have atleast one filter rule, you can start setting actions
          for the transactions that match those filters.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded border border-input">
      <div className="w-full flex justify-center items-center hover:bg-accent p-2 gap-3 border-solid border-input border-0 border-b">
        <div className="flex flex-col flex-1">
          <div className="text-sm font-semibold">Transaction Notes</div>
          <div className="text-muted-foreground text-xs">
            Add transaction notes, to help understand the transaction purpose.
          </div>
        </div>
        <div className="flex-1">
          <Input
            placeholder="Transaction notes"
            value={localAction.notes || ''}
            onChange={(e) => {
              handleActionChange({
                ...localAction,
                notes: e.target.value,
              });
            }}
          />
        </div>
      </div>

      <div className="w-full flex justify-center items-center hover:bg-accent p-2 gap-3 border-solid border-input border-0 border-b">
        <div className="flex flex-col flex-1">
          <div className="text-sm font-semibold">Is Internal Transaction?</div>
          <div className="text-muted-foreground text-xs">
            If this transaction is between your bank accounts, that you do not
            want to track as expense or income.
          </div>
        </div>
        <div className="flex-1">
          <Select
            value={localAction.isInternal || ''}
            onValueChange={(value) => {
              handleActionChange({
                ...localAction,
                isInternal: value ? (value as 'yes' | 'no') : undefined,
              });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Is internal transaction?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">
                Yes, this is an internal transaction
              </SelectItem>
              <SelectItem value="no">
                No, this is not an internal transaction
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="w-full flex justify-center items-center hover:bg-accent p-2 gap-3 border-solid border-input border-0 border-b">
        <div className="flex flex-col flex-1">
          <div className="text-sm font-semibold">Tags</div>
          <div className="text-muted-foreground text-xs">
            Add tags to these transactions for better clarity and filtering.
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Add tags to transaction"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button type="button" onClick={handleAddTag} size="sm">
              Add
            </Button>
          </div>
          {localAction.tags && localAction.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {localAction.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="default"
                  className="flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <IconX size={12} />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full flex justify-center items-center hover:bg-accent p-2 rounded gap-3">
        <div className="flex flex-col flex-1">
          <div className="text-sm font-semibold">Transaction Category</div>
          <div className="text-muted-foreground text-xs">
            Pick the category these transactions should be assigned to.
          </div>
        </div>
        <div className="flex-1">
          <CategoryCombobox
            categories={categories}
            value={localAction.category}
            onValueChange={(value) => {
              handleActionChange({
                ...localAction,
                category: value,
              });
            }}
            placeholder="Category"
          />
        </div>
      </div>
    </div>
  );
}
