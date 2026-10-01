'use client';

import { ChatPanel } from '@/components/ai';

export default function AskAiPage() {
  /*
   * A definite height, not flex-1.
   *
   * The app layout is `min-h-screen`, which bounds nothing: a `flex-1` child
   * grows with its content, so a long conversation pushed the composer off the
   * bottom and scrolled the whole page instead of the message list. Pinning the
   * height gives the conversation something to scroll inside.
   *
   * 4rem is the navbar (h-16), 1.25rem the layout's pt-5; -mb-24 cancels its
   * pb-24, which the panel replaces with its own bottom padding.
   */
  return (
    <div className="-mb-24 flex h-[calc(100dvh-5.25rem)] flex-col overflow-hidden">
      <ChatPanel />
    </div>
  );
}
