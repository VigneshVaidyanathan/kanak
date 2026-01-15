'use client';

import { useAuthStore } from '@/store/auth-store';
import { Transaction, TransactionRule } from '@kanak/shared';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  Input,
  Spinner,
} from '@kanak/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

interface DescriptionCellProps {
  transaction: Transaction;
  onSetUpRule: (
    selectedText: string,
    transactionType: 'credit' | 'debit'
  ) => void;
  onAddToExistingRule?: (
    selectedText: string,
    transactionType: 'credit' | 'debit',
    ruleId: string
  ) => void;
}

export function DescriptionCell({
  transaction,
  onSetUpRule,
  onAddToExistingRule,
}: DescriptionCellProps) {
  const { token } = useAuthStore();
  const [selectedText, setSelectedText] = useState<string>('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [rules, setRules] = useState<TransactionRule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRules, setLoadingRules] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';

    if (text) {
      setSelectedText(text);
      setShowContextMenu(true);
    } else {
      // Prevent context menu if no text is selected
      e.preventDefault();
      setShowContextMenu(false);
    }
  };

  const fetchRules = useCallback(async () => {
    if (!token) return;

    try {
      setLoadingRules(true);
      const response = await fetch('/api/transaction-rules', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transaction rules');
      }

      const data = await response.json();
      setRules(data);
    } catch (error) {
      console.error('Error fetching transaction rules:', error);
    } finally {
      setLoadingRules(false);
    }
  }, [token]);

  useEffect(() => {
    if (submenuOpen) {
      fetchRules();
    }
  }, [submenuOpen, fetchRules]);

  const handleSetUpRule = () => {
    if (selectedText) {
      onSetUpRule(selectedText, transaction.type);
      setShowContextMenu(false);
      // Clear selection
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
    }
  };

  const handleAddToExistingRule = (ruleId: string) => {
    if (selectedText && onAddToExistingRule) {
      onAddToExistingRule(selectedText, transaction.type, ruleId);
      setShowContextMenu(false);
      setSubmenuOpen(false);
      // Clear selection
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
    }
  };

  const filteredRules = rules.filter((rule) =>
    rule.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedRules = filteredRules.slice(0, 5);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .description-cell ::selection {
            background-color: black !important;
            color: white !important;
          }
          .description-cell ::-moz-selection {
            background-color: black !important;
            color: white !important;
          }
        `,
        }}
      />
      <ContextMenu
        onOpenChange={(open) => {
          setShowContextMenu(open);
          if (!open) {
            // Clear selection when menu closes
            setTimeout(() => {
              const selection = window.getSelection();
              if (selection) {
                selection.removeAllRanges();
              }
            }, 100);
          }
        }}
      >
        <ContextMenuTrigger asChild>
          <div
            ref={containerRef}
            className="text-sm description-cell cursor-text select-text break-all"
            onContextMenu={handleContextMenu}
            onMouseUp={() => {
              // Check if text is selected on mouse up
              const selection = window.getSelection();
              const text = selection?.toString().trim() || '';
              if (!text) {
                setShowContextMenu(false);
              }
            }}
          >
            <div className="text-xs">{transaction.description}</div>
          </div>
        </ContextMenuTrigger>
        {showContextMenu && selectedText && (
          <ContextMenuContent>
            <ContextMenuItem onClick={handleSetUpRule}>
              Create a new rule
            </ContextMenuItem>
            {onAddToExistingRule && (
              <ContextMenuSub open={submenuOpen} onOpenChange={setSubmenuOpen}>
                <ContextMenuSubTrigger>
                  Add to existing rule
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-64">
                  <div className="p-2">
                    <Input
                      placeholder="Search rules..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {loadingRules ? (
                      <div className="flex items-center justify-center p-4">
                        <Spinner className="h-4 w-4" />
                      </div>
                    ) : displayedRules.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        {searchQuery ? 'No rules found' : 'No rules available'}
                      </div>
                    ) : (
                      displayedRules.map((rule) => (
                        <ContextMenuItem
                          key={rule.id}
                          onClick={() => handleAddToExistingRule(rule.id)}
                          className="cursor-pointer"
                        >
                          {rule.title}
                        </ContextMenuItem>
                      ))
                    )}
                  </div>
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
          </ContextMenuContent>
        )}
      </ContextMenu>
    </>
  );
}
