import React from "react";
import { cn } from "../lib/utils.js";
import { ChatProvider, useChatContext } from "../hooks/ChatProvider.js";
import { MessageList } from "./MessageList.js";
import { MessageInput } from "./MessageInput.js";
import type { DisplayRendererMap } from "../display/registry.js";
import type { Message } from "../types.js";

export interface ChatProps {
  /** Base URL do servico openclaude (ex: http://localhost:9500/api/v1/ai). */
  endpoint: string;
  token?: string;
  /** Sessao live existente. Se omitida, o hook cria uma via POST /sessions. */
  sessionId?: string;
  initialMessages?: Message[];
  sessionOptions?: Record<string, unknown>;
  turnOptions?: Record<string, unknown>;
  displayRenderers?: DisplayRendererMap;
  placeholder?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  enableAttachments?: boolean;
  enableVoice?: boolean;
  fetcher?: typeof fetch;
  emptyState?: React.ReactNode;
}

interface ChatContentProps {
  displayRenderers?: DisplayRendererMap;
  placeholder?: string;
  enableAttachments?: boolean;
  enableVoice?: boolean;
  emptyState?: React.ReactNode;
}

function ChatContent({ displayRenderers, placeholder, enableAttachments = true, enableVoice = true, emptyState }: ChatContentProps) {
  const { messages, input, setInput, handleSubmit, isLoading, stop, error, reload } = useChatContext();

  return (
    <>
      <MessageList
        messages={messages}
        isLoading={isLoading}
        displayRenderers={displayRenderers}
        error={error ?? undefined}
        onRetry={reload}
        emptyState={emptyState}
      />
      <div className="px-4 pb-4">
        <MessageInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          stop={stop}
          placeholder={placeholder}
          enableAttachments={enableAttachments}
          enableVoice={enableVoice}
        />
      </div>
    </>
  );
}

export function Chat({
  endpoint,
  token,
  sessionId,
  initialMessages,
  sessionOptions,
  turnOptions,
  displayRenderers,
  placeholder,
  header,
  footer,
  className,
  enableAttachments,
  enableVoice,
  fetcher,
  emptyState,
}: ChatProps) {
  return (
    <ChatProvider
      key={sessionId}
      endpoint={endpoint}
      token={token}
      sessionId={sessionId}
      initialMessages={initialMessages}
      sessionOptions={sessionOptions}
      turnOptions={turnOptions}
      fetcher={fetcher}
    >
      <div className={cn("flex flex-col h-full bg-background text-foreground", className)}>
        {header}
        <ChatContent
          displayRenderers={displayRenderers}
          placeholder={placeholder}
          enableAttachments={enableAttachments}
          enableVoice={enableVoice}
          emptyState={emptyState}
        />
        {footer}
      </div>
    </ChatProvider>
  );
}
