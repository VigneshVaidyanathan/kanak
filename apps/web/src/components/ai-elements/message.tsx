/**
 * Vendored from https://registry.ai-sdk.dev/message.json
 * Patched: `import type { UIMessage } from 'ai'` was type-only and is replaced
 * by a local `Role`, so this feature pulls in no AI SDK. The branching,
 * attachment and toolbar exports are dropped — this chat has one branch and no
 * file uploads. Imports -> `@kanak/ui`.
 */
'use client';

import { cn } from '@kanak/ui/lib/utils';
import type { ComponentProps, HTMLAttributes } from 'react';
import { memo } from 'react';
import { Streamdown } from 'streamdown';

export type Role = 'user' | 'assistant';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: Role;
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      'group flex w-full max-w-[95%] flex-col gap-2',
      from === 'user' ? 'is-user ml-auto justify-end' : 'is-assistant',
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      'flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm',
      'group-[.is-user]:ml-auto group-[.is-user]:rounded-2xl group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground',
      'group-[.is-assistant]:w-full group-[.is-assistant]:text-foreground',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

/**
 * Markdown that stays readable while it is still arriving — Streamdown closes
 * unterminated code fences and tables as they stream.
 */
export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn(
        'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        className
      )}
      {...props}
    />
  ),
  (prev, next) => prev.children === next.children
);

MessageResponse.displayName = 'MessageResponse';
