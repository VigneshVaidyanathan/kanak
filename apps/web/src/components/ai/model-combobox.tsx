'use client';

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/shadcn-io/combobox';
import {
  formatContext,
  formatPrice,
  type AiModel,
  type AiModelGroup,
} from '@/lib/ai/models';
import { IconCheck } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

/**
 * How many models to render at once.
 *
 * cmdk rescores every mounted item on each keystroke, and the tool-capable
 * catalogue is ~390 models — enough to drop frames while typing. Filtering
 * ourselves and capping the list keeps it responsive; the search box is how you
 * reach anything past the cap.
 */
const VISIBLE_LIMIT = 60;

type ModelComboboxProps = {
  groups: AiModelGroup[];
  value?: string;
  onSelect: (modelId: string) => void;
  disabled?: boolean;
};

export function ModelCombobox({
  groups,
  value,
  onSelect,
  disabled,
}: ModelComboboxProps) {
  const [search, setSearch] = useState('');

  const flat = useMemo(
    () =>
      groups.flatMap((g) =>
        g.models.map((m) => ({ value: m.id, label: m.name }))
      ),
    [groups]
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();

    let budget = VISIBLE_LIMIT;
    const result: { provider: string; models: AiModel[] }[] = [];

    for (const group of groups) {
      if (budget <= 0) break;

      const hits = needle
        ? group.models.filter(
            (m) =>
              m.name.toLowerCase().includes(needle) ||
              m.id.toLowerCase().includes(needle)
          )
        : group.models;

      if (hits.length === 0) continue;

      result.push({ provider: group.provider, models: hits.slice(0, budget) });
      budget -= hits.length;
    }

    return result;
  }, [groups, search]);

  return (
    <Combobox
      data={flat}
      type="model"
      value={value ?? ''}
      onValueChange={onSelect}
    >
      <ComboboxTrigger className="w-full justify-between" disabled={disabled} />
      <ComboboxContent shouldFilter={false}>
        <ComboboxInput value={search} onValueChange={setSearch} />
        <ComboboxList className="max-h-[320px]">
          <ComboboxEmpty>No model found.</ComboboxEmpty>
          {visible.map((group) => (
            <ComboboxGroup key={group.provider} heading={group.provider}>
              {group.models.map((model) => (
                <ComboboxItem key={model.id} value={model.id}>
                  <IconCheck
                    className={
                      value === model.id
                        ? 'size-4 shrink-0'
                        : 'size-4 shrink-0 opacity-0'
                    }
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{model.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatContext(model.contextLength)} ·{' '}
                      {formatPrice(model.promptPrice)} in ·{' '}
                      {formatPrice(model.completionPrice)} out
                    </span>
                  </div>
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
