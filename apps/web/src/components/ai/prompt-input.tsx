'use client';

import { Button, Textarea } from '@kanak/ui';
import { IconArrowUp, IconPlayerStopFilled } from '@tabler/icons-react';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

// ponytail: hand-rolled instead of AI Elements' prompt-input, which needs
// shadcn's `input-group` (absent from @kanak/ui) plus nanoid for features this
// box doesn't have — no attachments, no model menu, no slash commands.
const MAX_HEIGHT = 200;

type PromptInputProps = {
  onSubmit: (text: string) => void;
  onStop: () => void;
  busy: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export function PromptInput({
  onSubmit,
  onStop,
  busy,
  disabled,
  placeholder = 'Ask about your spending, budgets or net worth…',
}: PromptInputProps) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow with the content, up to a point, then scroll.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = value.trim();
    if (!text || busy || disabled) return;
    setValue('');
    onSubmit(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter breaks the line — the convention everywhere else.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring"
    >
      <Textarea
        ref={ref}
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-0 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0"
      />

      {busy ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={onStop}
          className="shrink-0 rounded-full"
        >
          <IconPlayerStopFilled className="size-4" />
          <span className="sr-only">Stop</span>
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          disabled={!value.trim() || disabled}
          className="shrink-0 rounded-full"
        >
          <IconArrowUp className="size-4" />
          <span className="sr-only">Send</span>
        </Button>
      )}
    </form>
  );
}
