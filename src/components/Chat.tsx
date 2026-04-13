import React, { useEffect, useState, useMemo } from "react";
import { MessageSquare } from "lucide-react";
import { cn } from "../lib/utils.js";
import { ChatProvider, useChatContext } from "../hooks/ChatProvider.js";
import { MessageList } from "./MessageList.js";
import { MessageInput } from "./MessageInput.js";
import { ModelSelect } from "./ModelSelect.js";
import { LocaleSelect } from "./LocaleSelect.js";
import { useModels } from "../hooks/useModels.js";
import { LocaleProvider, useTranslation, resolveLocale } from "../i18n/index.js";
import type { CustomMessages, CustomLocaleInfo } from "../i18n/index.js";
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
  /** Locale inicial (aceita "pt-BR", "pt_br", "pt", etc). Default: "en-US". */
  locale?: string;
  /** Callback quando o usuario troca o locale via selector. */
  onLocaleChange?: (locale: string) => void;
  /** Translation overrides keyed by locale slug. */
  messages?: CustomMessages;
  /** Metadata for custom locales (shown in locale selector). */
  locales?: CustomLocaleInfo;
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

function NoSessionState({ children }: { children?: React.ReactNode }) {
  const { t } = useTranslation();
  return children ? (
    <>{children}</>
  ) : (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <MessageSquare className="size-7" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight">{t("chat.selectConversation")}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("chat.orCreateNew")}
        </p>
      </div>
    </div>
  );
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
  locale: localeProp,
  onLocaleChange,
  messages: messagesProp,
  locales: localesProp,
  fetcher,
  emptyState,
}: ChatProps) {
  const { models, defaultModel, isLoading: modelsLoading } = useModels(
    enableModelSelect ? endpoint : "",
    enableModelSelect ? fetcher : undefined,
  );
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
  const resolvedLocale = useMemo(() => resolveLocale(localeProp), [localeProp]);
  const [currentLocale, setCurrentLocale] = useState(resolvedLocale);

  // Sync internal state when parent changes locale prop (e.g. via ChatHeader)
  useEffect(() => {
    setCurrentLocale(resolvedLocale);
  }, [resolvedLocale]);

  const handleLocaleChange = (l: string) => {
    setCurrentLocale(l);
    onLocaleChange?.(l);
  };

  // Resolve o modelo efetivo: selecionado pelo usuario ou default do catalogo
  const effectiveModel = enableModelSelect
    ? selectedModel ?? defaultModel ?? undefined
    : undefined;

  // Memoiza sessionOptions para evitar re-render infinito quando model muda
  const mergedSessionOptions = useMemo(
    () => sessionOptions,
    [sessionOptions],
  );

  const bottomSlot = (
    <div className="flex items-center gap-1">
      <LocaleSelect value={currentLocale} onChange={handleLocaleChange} />
      {enableModelSelect && (
        <ModelSelect
          models={models}
          value={selectedModel ?? defaultModel ?? (models[0]?.id ?? "")}
          onChange={setSelectedModel}
          isLoading={modelsLoading}
        />
      )}
    </div>
  );

  if (!sessionId) {
    return (
      <LocaleProvider locale={currentLocale} messages={messagesProp} locales={localesProp}>
        <div className={cn("flex flex-col h-full bg-background text-foreground", className)}>
          {header}
          <NoSessionState>{emptyState}</NoSessionState>
          {footer}
        </div>
      </LocaleProvider>
    );
  }

  return (
    <LocaleProvider locale={currentLocale} messages={messagesProp} locales={localesProp}>
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
            bottomSlot={bottomSlot}
          />
          {footer}
        </div>
      </ChatProvider>
    </LocaleProvider>
  );
}
