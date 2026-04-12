import React, { createContext, useCallback, useContext, useState } from "react"
import type { ChatTransport } from "../transport.js"

export interface HistoryContextValue {
  activeConversationId: string | null
  setActiveConversation: (id: string | null) => void
  transport?: ChatTransport
}

const HistoryContext = createContext<HistoryContextValue | null>(null)

export interface HistoryProviderProps {
  children: React.ReactNode
  /** Optional custom transport passed down to History component. */
  transport?: ChatTransport
  /** Initial active conversation (uncontrolled). */
  defaultConversationId?: string | null
  /** Controlled active conversation. */
  activeConversationId?: string | null
  /** Called when active conversation changes. */
  onActiveChange?: (id: string | null) => void
}

export function HistoryProvider({
  children,
  transport,
  defaultConversationId = null,
  activeConversationId: controlledId,
  onActiveChange,
}: HistoryProviderProps) {
  const [uncontrolledId, setUncontrolledId] = useState<string | null>(defaultConversationId)

  const isControlled = controlledId !== undefined
  const activeId = isControlled ? controlledId : uncontrolledId

  const setActiveConversation = useCallback(
    (id: string | null) => {
      if (!isControlled) setUncontrolledId(id)
      onActiveChange?.(id)
    },
    [isControlled, onActiveChange],
  )

  return (
    <HistoryContext.Provider value={{ activeConversationId: activeId, setActiveConversation, transport }}>
      {children}
    </HistoryContext.Provider>
  )
}

export function useHistoryContext(): HistoryContextValue {
  const ctx = useContext(HistoryContext)
  if (!ctx) throw new Error("useHistoryContext must be used within HistoryProvider")
  return ctx
}
