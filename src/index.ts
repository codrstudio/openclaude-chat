// @codrstudio/openclaude-chat — barrel

// Tipos publicos
export type {
  Message,
  MessagePart,
  MessageRole,
  TextPart,
  ReasoningPart,
  ToolInvocationPart,
  ToolInvocationState,
  TurnMetadata,
} from "./types.js";

// Componente principal
export { Chat } from "./components/Chat.js";
export type { ChatProps, ChatMaxWidth } from "./components/Chat.js";

// Hook + Provider
export { useOpenClaudeChat } from "./hooks/useOpenClaudeChat.js";
export type {
  UseOpenClaudeChatOptions,
  UseOpenClaudeChatReturn,
} from "./hooks/useOpenClaudeChat.js";

export { ChatProvider, useChatContext } from "./hooks/ChatProvider.js";
export type { ChatProviderProps } from "./hooks/ChatProvider.js";

// Model select
export { ModelSelect } from "./components/ModelSelect.js";
export type { ModelSelectProps } from "./components/ModelSelect.js";
export { useModels } from "./hooks/useModels.js";
export type { ModelEntry, UseModelsReturn } from "./hooks/useModels.js";

// Subcomponentes
export { Markdown } from "./components/Markdown.js";
export { StreamingIndicator } from "./components/StreamingIndicator.js";
export { ErrorNote } from "./components/ErrorNote.js";
export type { ErrorNoteProps } from "./components/ErrorNote.js";
export { MessageBubble } from "./components/MessageBubble.js";
export type { MessageBubbleProps } from "./components/MessageBubble.js";
export { MessageList } from "./components/MessageList.js";
export type { MessageListProps } from "./components/MessageList.js";
export { MessageInput } from "./components/MessageInput.js";
export type { MessageInputProps, Attachment } from "./components/MessageInput.js";

// Parts
export { PartRenderer } from "./parts/PartRenderer.js";
export type { PartRendererProps } from "./parts/PartRenderer.js";
export { ReasoningBlock } from "./parts/ReasoningBlock.js";
export type { ReasoningBlockProps } from "./parts/ReasoningBlock.js";
export { ToolActivity, defaultToolIconMap } from "./parts/ToolActivity.js";
export type { ToolActivityProps, ToolActivityState } from "./parts/ToolActivity.js";
export { ToolResult } from "./parts/ToolResult.js";
export type { ToolResultProps } from "./parts/ToolResult.js";
export { TaskCard } from "./parts/TaskCard.js";
export type { TaskCardProps, TaskStatus } from "./parts/TaskCard.js";

// Display renderers
export { AlertRenderer } from "./display/AlertRenderer.js";
export { MetricCardRenderer } from "./display/MetricCardRenderer.js";
export { PriceHighlightRenderer } from "./display/PriceHighlightRenderer.js";
export { FileCardRenderer } from "./display/FileCardRenderer.js";
export { CodeBlockRenderer } from "./display/CodeBlockRenderer.js";
export { SourcesListRenderer } from "./display/SourcesListRenderer.js";
export { StepTimelineRenderer } from "./display/StepTimelineRenderer.js";
export { ProgressStepsRenderer } from "./display/ProgressStepsRenderer.js";
export { ChartRenderer } from "./display/ChartRenderer.js";
export { CarouselRenderer } from "./display/CarouselRenderer.js";
export { ProductCardRenderer } from "./display/ProductCardRenderer.js";
export { ComparisonTableRenderer } from "./display/ComparisonTableRenderer.js";
export { DataTableRenderer } from "./display/DataTableRenderer.js";
export { SpreadsheetRenderer } from "./display/SpreadsheetRenderer.js";
export { GalleryRenderer } from "./display/GalleryRenderer.js";
export { ImageViewerRenderer } from "./display/ImageViewerRenderer.js";
export { LinkPreviewRenderer } from "./display/LinkPreviewRenderer.js";
export { MapViewRenderer } from "./display/MapViewRenderer.js";
export { ChoiceButtonsRenderer } from "./display/ChoiceButtonsRenderer.js";

// Registry
export { defaultDisplayRenderers, resolveDisplayRenderer } from "./display/registry.js";
export type { DisplayRendererMap, DisplayActionName } from "./display/registry.js";

// History
export { History } from "./components/History.js";
export type { HistoryProps } from "./components/History.js";

export { HistoryProvider, useHistoryContext } from "./hooks/HistoryProvider.js";
export type { HistoryProviderProps, HistoryContextValue } from "./hooks/HistoryProvider.js";

export type { Conversation, ConversationGroup } from "./components/history/types.js";
export { createLocalStorageTransport, writeMessages } from "./components/history/useHistoryData.js";

// SDK conversion
export { convertSDKMessages, extractTextFromParts } from "./lib/sdk-to-message.js";
export type { SDKMessage, SDKAssistantMessage, SDKUserMessage, SDKResultMessage } from "./lib/sdk-to-message.js";

// Transport
export { createDefaultTransport } from "./transport.js";
export type { ChatTransport, ConversationDetail, GetMessagesParams, GetMessagesResult } from "./transport.js";

// i18n
export { LocaleProvider, useTranslation, builtInLocales, supportedLocales, defaultLocale, resolveLocale } from "./i18n/index.js";
export type { LocaleProviderProps, LocaleSlug, BuiltInLocale, LocaleInfo, TranslationKeys, CustomMessages, CustomLocaleInfo } from "./i18n/index.js";

// Locale select
export { LocaleSelect } from "./components/LocaleSelect.js";
export type { LocaleSelectProps } from "./components/LocaleSelect.js";

// ChatHeader
export { ChatHeader } from "./components/ChatHeader.js";
export type { ChatHeaderProps } from "./components/ChatHeader.js";

// HistoryTrigger (sidebar toggle button)
export { HistoryTrigger } from "./components/HistoryTrigger.js";
export type { HistoryTriggerProps } from "./components/HistoryTrigger.js";

// useIsMobile helper reuse
export { useIsMobile } from "./hooks/useIsMobile.js";
