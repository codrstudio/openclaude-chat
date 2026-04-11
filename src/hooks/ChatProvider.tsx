import React, { createContext, useContext } from "react";
import { useOpenClaudeChat, type UseOpenClaudeChatOptions } from "./useOpenClaudeChat.js";

type ChatContextValue = ReturnType<typeof useOpenClaudeChat>;

const ChatContext = createContext<ChatContextValue | null>(null);

export interface ChatProviderProps extends UseOpenClaudeChatOptions {
  children: React.ReactNode;
}

export function ChatProvider({ children, ...options }: ChatProviderProps) {
  const chat = useOpenClaudeChat(options);
  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}
