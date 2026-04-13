import React, { useCallback, useMemo, useState } from "react"
import { MessageSquarePlus } from "lucide-react"
import { cn } from "../lib/utils.js"
import { TooltipProvider } from "../ui/tooltip.js"
import { Button } from "../ui/button.js"
import { Separator } from "../ui/separator.js"
import { ScrollArea } from "../ui/scroll-area.js"
import { HistorySearch } from "./history/HistorySearch.js"
import { HistoryGroup } from "./history/HistoryGroup.js"
import { HistoryDeleteDialog } from "./history/HistoryDeleteDialog.js"
import { useHistoryData, createLocalStorageTransport } from "./history/useHistoryData.js"
import { createDefaultTransport, type ChatTransport } from "../transport.js"
import { LocaleProvider, useTranslation, resolveLocale } from "../i18n/index.js"
import type { CustomMessages, CustomLocaleInfo } from "../i18n/index.js"

export interface HistoryProps {
  /** Base URL for the default transport. Ignored if `transport` is provided. */
  endpoint?: string
  /** Bearer token for the default transport. Ignored if `transport` is provided. */
  token?: string
  /** Custom transport — overrides endpoint/token. */
  transport?: ChatTransport
  /** Currently active conversation id. */
  activeConversationId?: string | null
  /** Called when user selects a conversation. */
  onSelectConversation?: (id: string) => void
  /** Called when user creates a new conversation. Receives the new session id. */
  onNewConversation?: (id: string) => void
  /** Called after a conversation is deleted. */
  onDeleteConversation?: (id: string) => void
  /** Locale for UI strings (accepts "pt-BR", "pt_br", "pt", etc). */
  locale?: string
  /** Translation overrides keyed by locale slug. */
  messages?: CustomMessages
  /** Metadata for custom locales. */
  locales?: CustomLocaleInfo
  className?: string
}

/** Wrapper that provides LocaleProvider, then renders the content. */
export function History({ locale: localeProp, messages, locales, ...rest }: HistoryProps) {
  const resolvedLocale = resolveLocale(localeProp)
  return (
    <LocaleProvider locale={resolvedLocale} messages={messages} locales={locales}>
      <HistoryContent {...rest} />
    </LocaleProvider>
  )
}

function HistoryContent({
  endpoint,
  token,
  transport: customTransport,
  activeConversationId = null,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  className,
}: Omit<HistoryProps, "locale">) {
  const { t } = useTranslation()

  // Resolve transport: custom > default (endpoint) > localStorage mock
  const transport = useMemo(() => {
    if (customTransport) {
      if (endpoint) {
        console.warn(
          "[openclaude-chat] History: both `transport` and `endpoint` were provided. " +
          "`endpoint` and `token` are ignored when `transport` is set.",
        )
      }
      return customTransport
    }
    if (endpoint) return createDefaultTransport(endpoint, token)
    return createLocalStorageTransport()
  }, [customTransport, endpoint, token])

  const {
    filteredGroups,
    searchQuery,
    setSearchQuery,
    isLoading,
    createConversation,
    renameConversation,
    deleteConversation,
    toggleStar,
  } = useHistoryData(transport)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  const handleNew = useCallback(async () => {
    const sessionId = await createConversation()
    onNewConversation?.(sessionId)
    onSelectConversation?.(sessionId)
  }, [createConversation, onNewConversation, onSelectConversation])

  const handleSelect = useCallback(
    (id: string) => onSelectConversation?.(id),
    [onSelectConversation],
  )

  const handleDeleteRequest = useCallback(
    (id: string) => {
      for (const g of filteredGroups) {
        const c = g.conversations.find((x) => x.id === id)
        if (c) {
          setDeleteTarget({ id, title: c.title })
          return
        }
      }
    },
    [filteredGroups],
  )

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    await deleteConversation(deleteTarget.id)
    onDeleteConversation?.(deleteTarget.id)
    setDeleteTarget(null)
  }, [deleteTarget, deleteConversation, onDeleteConversation])

  const handleDeleteCancel = useCallback(() => setDeleteTarget(null), [])

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex h-full w-[280px] flex-col border-r bg-background", className)}>
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between px-3">
          <span className="text-sm font-semibold">{t("history.title")}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNew}>
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        {/* Search */}
        <div className="shrink-0 py-2">
          <HistorySearch value={searchQuery} onChange={setSearchQuery} />
        </div>

        <Separator />

        {/* List */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-2 p-1.5">
            {isLoading && filteredGroups.length === 0 && (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                {t("history.loading")}
              </div>
            )}

            {!isLoading && filteredGroups.length === 0 && (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                {searchQuery ? t("history.noResults") : t("history.empty")}
              </div>
            )}

            {filteredGroups.map((group) => (
              <HistoryGroup
                key={group.label}
                group={group}
                activeId={activeConversationId}
                onSelect={handleSelect}
                onRename={renameConversation}
                onDelete={handleDeleteRequest}
                onToggleStar={toggleStar}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Delete confirmation */}
        <HistoryDeleteDialog
          open={deleteTarget !== null}
          title={deleteTarget?.title ?? ""}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      </div>
    </TooltipProvider>
  )
}
