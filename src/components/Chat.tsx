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

// Literal classes so Tailwind's source scanner picks them all up at build time.
const MAX_WIDTH_CLASS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
} as const;

export type ChatMaxWidth = keyof typeof MAX_WIDTH_CLASS | false;

export interface ChatProps {
  /** Base URL do servico openclaude (ex: http://localhost:9500/api/v1/ai). */
  endpoint: string;
  token?: string;
  /** Sessao live existente. Se omitida, o hook cria uma via POST /conversations. */
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
  /** Mostra seletor de locale no bottomSlot do input. Default: true. */
  enableLocaleSelect?: boolean;
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
  /**
   * Max-width do conteudo do chat (mensagens + input). O chat se centraliza
   * horizontalmente dentro de um wrapper interno com esse limite. Passar
   * `false` desativa o limite e o chat ocupa 100% da largura disponivel.
   * Default: "3xl".
   */
  maxWidth?: ChatMaxWidth;
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
  enableLocaleSelect = true,
  locale: localeProp,
  onLocaleChange,
  messages: messagesProp,
  locales: localesProp,
  fetcher,
  emptyState,
  maxWidth = "3xl",
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

  const outerClass = cn(
    "flex flex-col flex-1 min-h-0 h-full bg-background text-foreground",
    maxWidth !== false && "items-center",
    className,
  );
  const innerClass = cn(
    "flex flex-col flex-1 min-h-0 w-full",
    maxWidth !== false && MAX_WIDTH_CLASS[maxWidth],
  );

  const hasBottomSlotContent = enableLocaleSelect || enableModelSelect;
  const bottomSlot = hasBottomSlotContent ? (
    <div className="flex items-center gap-1">
      {enableLocaleSelect && (
        <LocaleSelect value={currentLocale} onChange={handleLocaleChange} />
      )}
      {enableModelSelect && (
        <ModelSelect
          models={models}
          value={selectedModel ?? defaultModel ?? (models[0]?.id ?? "")}
          onChange={setSelectedModel}
          isLoading={modelsLoading}
        />
      )}
    </div>
  ) : undefined;

  if (!sessionId) {
    return (
      <LocaleProvider locale={currentLocale} messages={messagesProp} locales={localesProp}>
        <div className={outerClass}>
          <div className={innerClass}>
            {header}
            <NoSessionState>{emptyState}</NoSessionState>
            {footer}
          </div>
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
        <div className={outerClass}>
          <div className={innerClass}>
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
        </div>
      </ChatProvider>
    </LocaleProvider>
  );
}
