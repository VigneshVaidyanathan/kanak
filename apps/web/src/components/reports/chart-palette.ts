// Validated categorical palette (see globals.css --chart-1..8). Fixed order, never
// reassigned by rank. ponytail: cycles past 8 instead of folding into "Other";
// fold if a section ever has >8 line items worth telling apart.
export const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
  'var(--color-chart-7)',
  'var(--color-chart-8)',
];

export const colorAt = (index: number) =>
  CHART_COLORS[index % CHART_COLORS.length];
