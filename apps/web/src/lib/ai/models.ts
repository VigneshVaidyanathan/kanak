/** The model used until the user picks one in Settings. */
export const DEFAULT_AI_MODEL = 'anthropic/claude-sonnet-5.5';

export type AiModel = {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  /** USD per million prompt tokens. */
  promptPrice: number;
  /** USD per million completion tokens. */
  completionPrice: number;
};

export type AiModelGroup = {
  provider: string;
  models: AiModel[];
};

export function formatContext(tokens: number): string {
  if (tokens >= 1_000_000)
    return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 ? 1 : 0)}M ctx`;
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K ctx`;
  return `${tokens} ctx`;
}

export function formatPrice(perMillion: number): string {
  if (perMillion === 0) return 'free';
  return `$${perMillion < 1 ? perMillion.toFixed(2) : perMillion.toFixed(perMillion < 10 ? 1 : 0)}/M`;
}
