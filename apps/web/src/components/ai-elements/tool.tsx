/**
 * Loosely based on https://registry.ai-sdk.dev/tool.json, but rebuilt: the
 * registry version is a bordered card with a status badge, and a turn that
 * makes six reads then became six cards competing with the answer. This is a
 * one-line muted row that expands, so the tool trail reads as a footnote.
 *
 * Also dropped from the original: the `ToolUIPart` type import from `ai` (it
 * was type-only) and the `code-block` dependency, which pulls in shiki to
 * highlight small JSON blobs.
 */
'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@kanak/ui';
import { cn } from '@kanak/ui/lib/utils';
import { IconChevronRight, IconX } from '@tabler/icons-react';
import type { ComponentProps, ReactNode } from 'react';

export type ToolState = 'input-available' | 'output-available' | 'output-error';

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible className={cn('group w-full', className)} {...props} />
);

export type ToolHeaderProps = {
  // ReactNode, not string: a running tool shows a <Shimmer> here.
  title: ReactNode;
  state: ToolState;
  className?: string;
};

export const ToolHeader = ({ className, title, state }: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      'flex w-full cursor-pointer items-center gap-1 py-0.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground',
      state === 'output-error' && 'text-destructive hover:text-destructive',
      className
    )}
  >
    <IconChevronRight className="size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
    {state === 'output-error' && <IconX className="size-3.5 shrink-0" />}
    <span className="truncate">{title}</span>
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn('text-popover-foreground outline-none', className)}
    {...props}
  />
);

function Json({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <pre className="max-h-64 overflow-auto rounded bg-muted/60 p-2 text-[11px] leading-relaxed">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export type ToolIOProps = {
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

export const ToolIO = ({ input, output, errorText }: ToolIOProps) => (
  <div className="ml-4 space-y-2 border-l pl-3 pt-1">
    {input !== undefined && <Json label="Parameters" value={input} />}
    {errorText ? (
      <div className="rounded bg-destructive/10 p-2 text-[11px] text-destructive">
        {errorText}
      </div>
    ) : (
      output !== undefined && <Json label="Result" value={output} />
    )}
  </div>
);
