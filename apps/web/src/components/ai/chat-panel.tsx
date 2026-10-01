'use client';

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { DEFAULT_AI_MODEL } from '@/lib/ai/models';
import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import { Button } from '@kanak/ui';
import { IconSparkles, IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery } from 'convex/react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { ChatHistorySheet } from './chat-history-sheet';
import { ChatMessage } from './chat-message';
import { PromptInput } from './prompt-input';
import { useAiStream, type ChatMessage as Msg } from './use-ai-stream';

/** Enough of the first question to recognise the chat in the history list. */
const titleFrom = (text: string) =>
  text.length > 60 ? `${text.slice(0, 57)}…` : text;

export function ChatPanel() {
  const [chatId, setChatId] = useState<Id<'ai_chats'> | null>(null);

  const settings = useQuery(api.userSettings.getUserSettings, {});
  const createChat = useMutation(api.aiChats.createChat);
  const appendMessages = useMutation(api.aiChats.appendMessages);

  // Writes are issued from here, never from the chat endpoint — keeping every
  // mutation out of the AI request path is what makes "the assistant can only
  // read" a property of the code rather than a promise in a prompt.
  const chatIdRef = useRef<Id<'ai_chats'> | null>(null);
  chatIdRef.current = chatId;

  // Chats whose messages must not be replayed from the database. A chat created
  // by the current turn already has its messages on screen, and reloading them
  // mid-stream would wipe the reply as it arrives.
  const skipReplay = useRef(new Set<string>());

  const handleFinish = useCallback(
    (assistant: Msg) => {
      const id = chatIdRef.current;
      if (!id || assistant.parts.length === 0) return;
      void appendMessages({
        chatId: id,
        messages: [{ role: 'assistant', parts: assistant.parts }],
      });
    },
    [appendMessages]
  );

  const { messages, status, error, send, stop, reset, setMessages } =
    useAiStream(handleFinish);

  const model = settings?.aiModel ?? DEFAULT_AI_MODEL;

  const handleSubmit = async (text: string) => {
    let id = chatIdRef.current;

    if (!id) {
      const created = (await createChat({
        title: titleFrom(text),
        model,
      })) as Id<'ai_chats'>;
      skipReplay.current.add(created);
      chatIdRef.current = created;
      setChatId(created);
      id = created;
    }

    void appendMessages({
      chatId: id,
      messages: [{ role: 'user', parts: [{ type: 'text', text }] }],
    });

    void send(text);
  };

  const handleNewChat = () => {
    chatIdRef.current = null;
    setChatId(null);
    reset([]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The page title, in the same shape as every other page's — a second
          bordered bar here just stole height from the conversation. */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ask AI</h1>
          <h2 className="text-sm text-muted-foreground">
            Ask questions about your money. {model}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={handleNewChat}>
            <IconPlus className="size-4" />
            New chat
          </Button>
          <ChatHistorySheet
            activeChatId={chatId}
            onSelect={(id) => setChatId(id)}
          />
        </div>
      </div>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto min-h-full w-full max-w-3xl">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<IconSparkles className="size-8" />}
              title="Ask about your money"
              description="“How much did I spend on groceries last month?” · “Am I over budget this year?” · “What's my net worth trend?”"
            />
          ) : (
            messages.map((message, i) => (
              <ChatMessage key={i} message={message} />
            ))
          )}

          {status === 'submitted' && <Shimmer>Thinking…</Shimmer>}

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-4 pb-3 pt-2">
        <PromptInput
          onSubmit={handleSubmit}
          onStop={stop}
          busy={status !== 'idle'}
        />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          The assistant can read your data but never change it.
        </p>
      </div>

      <HistoryLoader
        chatId={chatId}
        setMessages={setMessages}
        skipReplay={skipReplay}
      />
    </div>
  );
}

/**
 * Replays a chat picked from the history pane.
 *
 * Split out so the subscription is only mounted when a saved chat is open —
 * `useQuery` has no "skip until needed" form that keeps the hook order stable
 * in the parent.
 */
function HistoryLoader({
  chatId,
  setMessages,
  skipReplay,
}: {
  chatId: Id<'ai_chats'> | null;
  setMessages: (messages: Msg[]) => void;
  skipReplay: MutableRefObject<Set<string>>;
}) {
  const stored = useQuery(
    api.aiChats.getMessagesByChatId,
    chatId ? { chatId } : 'skip'
  );

  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!chatId || stored === undefined) return;
    if (skipReplay.current.has(chatId)) return;
    // Only on the switch into a chat: after that the live stream owns the list,
    // and re-syncing would clobber a turn mid-flight.
    if (loadedFor.current === chatId) return;

    loadedFor.current = chatId;
    setMessages(stored.map((m) => ({ role: m.role, parts: m.parts })) as Msg[]);
  }, [chatId, stored, setMessages, skipReplay]);

  return null;
}
