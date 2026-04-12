import React, { useState, useMemo } from "react";
import { cn } from "../lib/utils.js";
import { ChatProvider, useChatContext } from "../hooks/ChatProvider.js";
import { MessageList } from "./MessageList.js";
import { MessageInput } from "./MessageInput.js";
import { ModelSelect } from "./ModelSelect.js";
import { useModels } from "../hooks/useModels.js";
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
  /** Mostra combo de selecao de modelo (carregado via GET /models). */
  enableModelSelect?: boolean;
  fetcher?: typeof fetch;
  emptyState?: React.ReactNode;
}

interface ChatContentProps {
  displayRenderers?: DisplayRendererMap;
  placeholder?: string;
  enableAttachments?: boolean;
  enableVoice?: boolean;
  emptyState?: React.ReactNode;
  bottomSlot?: React.ReactNode;
}

function ChatContent({ displayRenderers, placeholder, enableAttachments = true, enableVoice = true, emptyState, bottomSlot }: ChatContentProps) {
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
          bottomSlot={bottomSlot}
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
  enableModelSelect,
  fetcher,
  emptyState,
}: ChatProps) {
  const { models, defaultModel, isLoading: modelsLoading } = useModels(
    enableModelSelect ? endpoint : "",
    enableModelSelect ? fetcher : undefined,
  );
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);

  // Resolve o modelo efetivo: selecionado pelo usuario ou default do catalogo
  const effectiveModel = enableModelSelect
    ? selectedModel ?? defaultModel ?? undefined
    : undefined;

  // Memoiza sessionOptions para evitar re-render infinito quando model muda
  const mergedSessionOptions = useMemo(
    () => sessionOptions,
    [sessionOptions],
  );

  return (
    <ChatProvider
      key={sessionId}
      endpoint={endpoint}
      token={token}
      sessionId={sessionId}
      initialMessages={initialMessages}
      sessionOptions={mergedSessionOptions}
      turnOptions={turnOptions}
      model={effectiveModel}
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
          bottomSlot={enableModelSelect ? (
            <ModelSelect
              models={models}
              value={selectedModel ?? defaultModel ?? (models[0]?.id ?? "")}
              onChange={setSelectedModel}
              isLoading={modelsLoading}
            />
          ) : undefined}
        />
        {footer}
      </div>
    </ChatProvider>
  );
}
