'use client';

import { DEFAULT_AI_MODEL, type AiModelGroup } from '@/lib/ai/models';
import { api } from '@kanak/convex/src/_generated/api';
import { Spinner } from '@kanak/ui';
import { useMutation, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ModelCombobox } from './model-combobox';

export function AiSettingsSection() {
  const settings = useQuery(api.userSettings.getUserSettings, {});
  const setAiModel = useMutation(api.userSettings.setAiModel);

  const [groups, setGroups] = useState<AiModelGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/ai/models')
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status)))
      )
      .then((data: { groups: AiModelGroup[] }) => {
        if (!cancelled) setGroups(data.groups);
      })
      .catch(() => {
        if (!cancelled)
          setError('Could not load the model list from OpenRouter.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = async (modelId: string) => {
    setSaving(true);
    try {
      await setAiModel({ model: modelId });
      toast.success('Default model updated');
    } catch {
      toast.error('Could not save the model');
    } finally {
      setSaving(false);
    }
  };

  const selected = settings?.aiModel ?? DEFAULT_AI_MODEL;
  const total = groups?.reduce((n, g) => n + g.models.length, 0) ?? 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">AI assistant</h3>
        <p className="text-sm text-muted-foreground">
          The model that answers your questions on the Ask AI page.
        </p>
      </div>

      <div className="max-w-xl space-y-2">
        <label className="text-sm font-medium" htmlFor="ai-model">
          Default model
        </label>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : groups === null || settings === undefined ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Loading models…
          </div>
        ) : (
          <>
            <ModelCombobox
              groups={groups}
              value={selected}
              onSelect={handleSelect}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              {total} models across {groups.length} providers. Only models that
              support tool calling are listed — the assistant needs tools to
              read your data.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
