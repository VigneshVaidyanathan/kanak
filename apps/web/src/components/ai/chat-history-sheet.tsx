'use client';

import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@kanak/ui';
import { IconDots, IconHistory, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery } from 'convex/react';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

type Chat = {
  id: Id<'ai_chats'>;
  title: string;
  lastMessageAt: number;
};

/** Today / Yesterday / Earlier, the way every chat app groups history. */
function bucketOf(timestamp: number): string {
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  if (timestamp >= startOfToday) return 'Today';
  if (timestamp >= startOfToday - 86_400_000) return 'Yesterday';
  return 'Earlier';
}

type ChatHistorySheetProps = {
  activeChatId: Id<'ai_chats'> | null;
  onSelect: (chatId: Id<'ai_chats'>) => void;
  trigger?: ReactNode;
};

export function ChatHistorySheet({
  activeChatId,
  onSelect,
  trigger,
}: ChatHistorySheetProps) {
  const [open, setOpen] = useState(false);
  const chats = useQuery(api.aiChats.getChatsByUserId, {}) as
    | Chat[]
    | undefined;
  const deleteChat = useMutation(api.aiChats.deleteChat);

  const buckets = useMemo(() => {
    const grouped = new Map<string, Chat[]>();
    for (const chat of chats ?? []) {
      const key = bucketOf(chat.lastMessageAt);
      grouped.set(key, [...(grouped.get(key) ?? []), chat]);
    }
    // Map preserves insertion order, and chats arrive newest-first, so the
    // buckets already come out Today -> Yesterday -> Earlier.
    return [...grouped.entries()];
  }, [chats]);

  const handleDelete = async (id: Id<'ai_chats'>) => {
    try {
      await deleteChat({ id });
      toast.success('Chat deleted');
    } catch {
      toast.error('Could not delete the chat');
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            <IconHistory className="size-4" />
            History
          </Button>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-[340px] sm:max-w-[340px]">
        <SheetHeader>
          <SheetTitle>Chat history</SheetTitle>
          <SheetDescription>Your previous conversations.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] px-4">
          {chats === undefined ? (
            <p className="py-4 text-sm text-muted-foreground">Loading…</p>
          ) : chats.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No chats yet. Ask something to start one.
            </p>
          ) : (
            buckets.map(([bucket, items]) => (
              <div key={bucket} className="mb-4">
                <h4 className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {bucket}
                </h4>
                {items.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent ${
                      chat.id === activeChatId ? 'bg-accent' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="flex-1 truncate text-left"
                      onClick={() => {
                        onSelect(chat.id);
                        setOpen(false);
                      }}
                    >
                      {chat.title}
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0 opacity-0 group-hover:opacity-100"
                        >
                          <IconDots className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(chat.id)}
                        >
                          <IconTrash className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ))
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
