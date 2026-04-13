// Transport layer — abstrai a comunicacao HTTP dos componentes.
// Componentes nunca chamam fetch diretamente; usam um ChatTransport.

import type { Conversation } from "./components/history/types.js"
import type { Message } from "./types.js"

// ── Tipos auxiliares ─────────────────────────────────────────────────────

export interface ConversationDetail extends Conversation {
  agentId?: string
}

export interface GetMessagesParams {
  /** Max messages to return. Default: 50, max: 200. */
  limit?: number
  /** Cursor — return messages before this point. Omit for latest messages. */
  before?: string
}

export interface GetMessagesResult {
  messages: Message[]
  /** true if there are older messages available. */
  hasMore: boolean
  /** Cursor for the next page (null if no more). */
  cursor: string | null
}

// ── Interface principal ──────────────────────────────────────────────────

export interface ChatTransport {
  // --- Conversas (History, TopBar) ---
  listConversations(params?: { agentId?: string }): Promise<Conversation[]>
  createConversation(params?: {
    agentId?: string
    options?: Record<string, unknown>
  }): Promise<{ sessionId: string }>
  getConversation(id: string): Promise<ConversationDetail>
  updateConversation(id: string, data: { title?: string; starred?: boolean }): Promise<void>
  deleteConversation(id: string): Promise<void>
  exportConversation(id: string, format?: "json" | "markdown"): Promise<Blob>

  // --- Mensagens (Chat) ---
  getMessages(conversationId: string, params?: GetMessagesParams): Promise<GetMessagesResult>
  sendMessage(
    conversationId: string,
    params: { content: string; attachments?: File[] },
  ): AsyncGenerator<unknown> | ReadableStream<unknown>
  getAttachmentUrl(conversationId: string, file: string): string
}

// ── Transport default (fetch) ────────────────────────────────────────────

export function createDefaultTransport(endpoint: string, token?: string): ChatTransport {
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (token) baseHeaders["Authorization"] = `Bearer ${token}`

  async function request(method: string, path: string, body?: unknown): Promise<Response> {
    const res = await fetch(`${endpoint}${path}`, {
      method,
      headers: baseHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`)
      throw new Error(`${method} ${path}: ${res.status} — ${errText}`)
    }
    return res
  }

  return {
    async listConversations(params) {
      const qs = params?.agentId ? `?agentId=${encodeURIComponent(params.agentId)}` : ""
      const res = await request("GET", `/conversations${qs}`)
      return res.json()
    },

    async createConversation(params) {
      const res = await request("POST", "/conversations", params)
      return res.json()
    },

    async getConversation(id) {
      const res = await request("GET", `/conversations/${encodeURIComponent(id)}`)
      return res.json()
    },

    async updateConversation(id, data) {
      await request("PATCH", `/conversations/${encodeURIComponent(id)}`, data)
    },

    async deleteConversation(id) {
      await request("DELETE", `/conversations/${encodeURIComponent(id)}`)
    },

    async exportConversation(id, format = "json") {
      const res = await request(
        "GET",
        `/conversations/${encodeURIComponent(id)}/export?format=${format}`,
      )
      return res.blob()
    },

    async getMessages(id, params) {
      const qs = new URLSearchParams()
      if (params?.limit) qs.set("limit", String(params.limit))
      if (params?.before) qs.set("before", params.before)
      const qsStr = qs.toString()
      const res = await request("GET", `/conversations/${encodeURIComponent(id)}/messages${qsStr ? `?${qsStr}` : ""}`)
      return res.json()
    },

    sendMessage(_id, _params) {
      // SSE streaming — implementacao real depende de como o Chat consome o stream.
      // Sera conectada quando o Chat migrar para o transport layer.
      throw new Error("sendMessage via transport not yet wired — Chat still uses useOpenClaudeChat SSE directly")
    },

    getAttachmentUrl(id, file) {
      const tokenQs = token ? `?token=${encodeURIComponent(token)}` : ""
      return `${endpoint}/conversations/${encodeURIComponent(id)}/attachments/${encodeURIComponent(file)}${tokenQs}`
    },
  }
}
