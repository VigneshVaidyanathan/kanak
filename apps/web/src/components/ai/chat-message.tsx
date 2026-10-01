'use client';

import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import { Shimmer } from '@/components/ai-elements/shimmer';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolIO,
} from '@/components/ai-elements/tool';
import type { ChatMessage as ChatMessageType } from './use-ai-stream';

/** Tool names as they read in the UI. */
const TOOL_LABELS: Record<string, string> = {
  listCategories: 'Reading your categories',
  listBankAccounts: 'Reading your bank accounts',
  getTransactions: 'Reading transactions',
  summarizeSpending: 'Summarising spending',
  getBudgets: 'Reading budgets',
  getBudgetHistory: 'Reading budget history',
  getNetWorth: 'Calculating net worth',
  listTransactionRules: 'Reading your rules',
  queryTable: 'Querying your data',
};

export function ChatMessage({ message }: { message: ChatMessageType }) {
  return (
    <Message from={message.role}>
      <MessageContent>
        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            return message.role === 'user' ? (
              <p key={i} className="whitespace-pre-wrap">
                {part.text}
              </p>
            ) : (
              <MessageResponse key={i}>{part.text}</MessageResponse>
            );
          }

          const label = TOOL_LABELS[part.name] ?? part.name;
          const state =
            part.error !== undefined
              ? 'output-error'
              : part.result !== undefined
                ? 'output-available'
                : 'input-available';

          return (
            <Tool key={part.id ?? i}>
              <ToolHeader
                state={state}
                title={
                  state === 'input-available' ? (
                    <Shimmer as="span">{`${label}…`}</Shimmer>
                  ) : (
                    label
                  )
                }
              />
              <ToolContent>
                <ToolIO
                  input={part.args}
                  output={part.error ? undefined : part.result}
                  errorText={part.error}
                />
              </ToolContent>
            </Tool>
          );
        })}
      </MessageContent>
    </Message>
  );
}
