import { createAuthErrorResponse, verifyAuth } from '@/lib/auth';
import type { AiModel, AiModelGroup } from '@/lib/ai/models';
import { NextResponse } from 'next/server';

// OpenRouter's catalogue moves slowly and the endpoint is public, so one hourly
// fetch serves every user. The raw payload is ~1 MB; what we return is ~40 KB.
export const revalidate = 3600;

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

type OpenRouterModel = {
  id: string;
  name: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
};

export async function GET(): Promise<NextResponse> {
  try {
    await verifyAuth();
  } catch {
    return createAuthErrorResponse('Unauthorized') as NextResponse;
  }

  const response = await fetch(OPENROUTER_MODELS_URL, {
    next: { revalidate },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Could not reach OpenRouter' },
      { status: 502 }
    );
  }

  const { data } = (await response.json()) as { data: OpenRouterModel[] };

  const models: AiModel[] = data
    // A model that cannot call tools cannot query the database, which is the
    // entire job. Offering one would produce a broken assistant and no error.
    .filter((m) => m.supported_parameters?.includes('tools'))
    .map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.id.split('/')[0],
      contextLength: m.context_length ?? 0,
      promptPrice: Number(m.pricing?.prompt ?? 0) * 1_000_000,
      completionPrice: Number(m.pricing?.completion ?? 0) * 1_000_000,
    }));

  const byProvider = new Map<string, AiModel[]>();
  for (const model of models) {
    const list = byProvider.get(model.provider) ?? [];
    list.push(model);
    byProvider.set(model.provider, list);
  }

  const groups: AiModelGroup[] = [...byProvider.entries()]
    .map(([provider, list]) => ({
      provider,
      models: list.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.provider.localeCompare(b.provider));

  return NextResponse.json({ groups, total: models.length });
}
