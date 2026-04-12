import { useCallback, useEffect, useRef, useState } from "react";
import type { Message, MessagePart, ToolInvocationPart } from "../types.js";

// Minimo necessario dos tipos de @codrstudio/openclaude-sdk — evita dep dura.
interface TextBlock {
  type: "text";
  text: string;
}
interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}
interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: unknown;
  is_error?: boolean;
}
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

interface SDKAssistantMessage {
  type: "assistant";
  uuid: string;
  session_id: string;
  message: { id: string; content: ContentBlock[] };
  parent_tool_use_id: string | null;
}
interface SDKUserMessage {
  type: "user";
  session_id: string;
  message: { content: ContentBlock[] | unknown };
  parent_tool_use_id: string | null;
}
interface SDKResultMessage {
  type: "result";
  subtype?: string;
  session_id: string;
  total_cost_usd?: number;
  duration_ms?: number;
  is_error?: boolean;
}
interface SDKSystemMessage {
  type: "system";
  subtype?: string;
  session_id: string;
}
type SDKMessage =
  | SDKAssistantMessage
  | SDKUserMessage
  | SDKResultMessage
  | SDKSystemMessage
  | { type: string; [k: string]: unknown };

// ─────────────────────────────────────────────────────────────────────────────

export interface UseOpenClaudeChatOptions {
  /** Base URL do servico que encapsula o openclaude-sdk. Ex: http://localhost:9500/api/v1/ai */
  endpoint: string;
  /** Optional bearer token. */
  token?: string;
  /**
   * ID de sessao live. Caso omitido, o hook cria uma sessao nova via POST /sessions
   * na primeira mensagem e expoe o id via `sessionId`.
   */
  sessionId?: string;
  /** Mensagens iniciais (historico) para hidratar a UI. */
  initialMessages?: Message[];
  /** Options extras passadas ao servidor na criacao da sessao. */
  sessionOptions?: Record<string, unknown>;
  /** Options por turno. Passado como `turnOptions` no body do /prompt. */
  turnOptions?: Record<string, unknown>;
  /** Modelo selecionado. Enviado como `model` no body de /sessions e /prompt. */
  model?: string;
  /** Customiza fetch (ex: para injetar credenciais). */
  fetcher?: typeof fetch;
}

export interface UseOpenClaudeChatReturn {
  sessionId: string | null;
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  error: Error | null;
  handleSubmit: (e?: { preventDefault?: () => void }) => void;
  sendMessage: (text: string) => Promise<void>;
  stop: () => void;
  reload: () => Promise<void>;
  clear: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────

function extractTextFromParts(parts: MessagePart[]): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────

export function useOpenClaudeChat(options: UseOpenClaudeChatOptions): UseOpenClaudeChatReturn {
  const {
    endpoint,
    token,
    sessionId: providedSessionId,
    initialMessages,
    sessionOptions,
    turnOptions,
    model,
    fetcher,
  } = options;

  const [sessionId, setSessionId] = useState<string | null>(providedSessionId ?? null);
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lastSentRef = useRef<string | null>(null);

  const doFetch = fetcher ?? fetch;

  // ──────────────────────────────────────────────────────────────
  // Garante sessao live
  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await doFetch(`${endpoint}/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ options: sessionOptions ?? {}, ...(model ? { model } : {}) }),
    });
    if (!res.ok) {
      throw new Error(`Failed to create session: HTTP ${res.status}`);
    }
    const data = (await res.json()) as { sessionId: string };
    setSessionId(data.sessionId);
    return data.sessionId;
  }, [sessionId, endpoint, token, sessionOptions, model, doFetch]);

  // ──────────────────────────────────────────────────────────────
  // Stream parser — consome SSE do endpoint /sessions/:id/prompt
  // Contrato: SEMPRE promove um assistantId no setMessages e SEMPRE retorna
  // o numero de partes acumuladas. O chamador decide se isso configura erro
  // (ex: zero partes = resposta vazia, mesmo com HTTP 200).
  const streamPrompt = useCallback(
    async (sid: string, text: string): Promise<{ assistantId: string; partCount: number }> => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      // Watchdog de stall — se nao chegar NENHUM byte SSE (incluindo ping) em
      // STALL_MS, considera sessao morta e aborta. Subimos pra 90s pra tolerar
      // chat agentico (LLM pode pensar muito entre tool calls). O servidor
      // emite `event: ping` periodicamente como heartbeat — qualquer chunk SSE
      // (ping ou message) renova esse timer via armStall().
      const STALL_MS = 90_000;
      let stallTimer: ReturnType<typeof setTimeout> | null = null;
      const armStall = () => {
        if (stallTimer) clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          try { ctrl.abort(new Error("stall-timeout")); } catch { /* noop */ }
        }, STALL_MS);
      };
      const disarmStall = () => {
        if (stallTimer) clearTimeout(stallTimer);
        stallTimer = null;
      };

      // Cria placeholder assistant ANTES do fetch — garante feedback visual imediato
      // mesmo em caso de rede lenta ou erro no fetch.
      const assistantId = `asst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", parts: [] },
      ]);

      armStall();
      let res: Response;
      try {
        res = await doFetch(`${endpoint}/sessions/${encodeURIComponent(sid)}/prompt`, {
          method: "POST",
          headers,
          body: JSON.stringify({ prompt: text, turnOptions, ...(model ? { model } : {}) }),
          signal: ctrl.signal,
        });
      } catch (err) {
        disarmStall();
        throw err;
      }

      if (!res.ok || !res.body) {
        disarmStall();
        const errText = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Buffer acumulado de partes — fonte da verdade para esta sessao de stream.
      // Mantemos fora do functional updater do setMessages (o React 19 StrictMode
      // chama o updater mais de uma vez e mutar estado compartilhado dentro dele
      // leva a blocos perdidos).
      const accumulatedParts: MessagePart[] = [];
      const toolPartByCallId = new Map<string, ToolInvocationPart>();

      const commit = () => {
        const snapshot = accumulatedParts.map((p) => ({ ...p }));
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === assistantId);
          if (idx === -1) return prev;
          const next = prev.slice();
          next[idx] = {
            ...prev[idx],
            parts: snapshot,
            content: extractTextFromParts(snapshot),
          };
          return next;
        });
      };

      const handleEvent = (eventName: string, dataStr: string) => {
        if (eventName === "error") {
          try {
            const payload = JSON.parse(dataStr) as { message?: string; name?: string };
            throw new Error(payload.message ?? "Stream error");
          } catch (err) {
            throw err instanceof Error ? err : new Error(String(err));
          }
        }
        if (eventName === "done") return;
        // Heartbeat do servidor — `event: ping` apenas serve para manter o
        // stall watchdog renovado durante pausas longas do agente. Nao tem
        // payload util; o efeito ja foi aplicado no loop ao chamar armStall()
        // a cada chunk recebido. Apenas retornamos sem processar.
        if (eventName === "ping" || eventName === "keepalive" || eventName === "heartbeat") return;
        if (eventName !== "message") return;

        let msg: SDKMessage;
        try {
          msg = JSON.parse(dataStr) as SDKMessage;
        } catch {
          return;
        }

        if (msg.type === "assistant") {
          const assistant = msg as SDKAssistantMessage;
          const blocks = assistant.message?.content ?? [];
          for (const block of blocks) {
            if (block.type === "text") {
              accumulatedParts.push({ type: "text", text: block.text });
            } else if (block.type === "tool_use") {
              if (toolPartByCallId.has(block.id)) continue;
              const part: ToolInvocationPart = {
                type: "tool-invocation",
                toolInvocation: {
                  toolName: block.name,
                  toolCallId: block.id,
                  state: "call",
                  args: block.input,
                },
              };
              toolPartByCallId.set(block.id, part);
              accumulatedParts.push(part);
            }
          }
          commit();
          return;
        }

        if (msg.type === "user") {
          // Normalmente traz tool_result com ref a tool_use anterior.
          const userMsg = msg as SDKUserMessage;
          const content = userMsg.message?.content;
          if (Array.isArray(content)) {
            let changed = false;
            for (const block of content as ContentBlock[]) {
              if (block.type === "tool_result") {
                const part = toolPartByCallId.get(block.tool_use_id);
                if (part) {
                  part.toolInvocation = {
                    ...part.toolInvocation,
                    state: "result",
                    result: block.content,
                    isError: block.is_error,
                  };
                  changed = true;
                }
              }
            }
            if (changed) commit();
          }
          return;
        }

        if (msg.type === "result") {
          // fim do turno — nada a fazer aqui; o loop quebra no "done"
          return;
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          armStall(); // reset watchdog a cada chunk que chega
          buffer += decoder.decode(value, { stream: true });

          // SSE frames: "event: X\ndata: Y\n\n"
          let boundary: number;
          while ((boundary = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            let eventName = "message";
            const dataLines: string[] = [];
            for (const line of frame.split("\n")) {
              if (line.startsWith("event:")) eventName = line.slice(6).trim();
              else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
            }
            if (dataLines.length === 0) continue;
            handleEvent(eventName, dataLines.join("\n"));
          }
        }
      } finally {
        disarmStall();
        abortRef.current = null;
      }

      // The server may filter out tool_result-only user messages (tool intention
      // filter in the SDK). Mark any tool calls still in "call" state as completed
      // so the UI doesn't show a perpetual spinner.
      let settled = false;
      for (const part of accumulatedParts) {
        if (part.type === "tool-invocation") {
          const tip = part as ToolInvocationPart;
          if (tip.toolInvocation.state === "call" || tip.toolInvocation.state === "partial-call") {
            tip.toolInvocation = { ...tip.toolInvocation, state: "result", result: null };
            settled = true;
          }
        }
      }
      if (settled) commit();

      return { assistantId, partCount: accumulatedParts.length };
    },
    [endpoint, token, turnOptions, model, doFetch],
  );

  // ──────────────────────────────────────────────────────────────
  // Helper: garante que NUNCA fica uma bolha de assistant vazia pendurada.
  // Se o turno terminou em erro ou em stream vazio, removemos o placeholder
  // (para o ErrorNote abaixo da mensagem do usuario aparecer) ou injetamos
  // um bloco de texto com a mensagem de erro para o usuario.
  const dropEmptyAssistant = useCallback((assistantId: string | null) => {
    if (!assistantId) return;
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === assistantId);
      if (idx === -1) return prev;
      const msg = prev[idx];
      if (msg.role === "assistant" && msg.parts.length === 0) {
        const next = prev.slice();
        next.splice(idx, 1);
        return next;
      }
      return prev;
    });
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;
      setError(null);
      lastSentRef.current = trimmed;

      const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setMessages((prev) => [
        ...prev,
        {
          id: userId,
          role: "user",
          content: trimmed,
          parts: [{ type: "text", text: trimmed }],
        },
      ]);

      setIsLoading(true);
      // NOTE: removido o `HARD_LIMIT_MS` do turno inteiro. Em chat agentico o
      // agente pode pensar/rodar tools por minutos sem ser uma falha. A unica
      // razao para abortar e:
      //   - usuario clicou stop() (flag __userStop)
      //   - stall watchdog (sem nenhum byte SSE em STALL_MS, incluindo pings
      //     do servidor — heartbeat server-push e como sabemos que a sessao
      //     ainda esta viva mesmo durante pausas longas do LLM)
      //   - servidor emitiu `event: error` ou fechou o stream com 0 partes

      let assistantIdForCleanup: string | null = null;
      try {
        const sid = await ensureSession();
        const { assistantId, partCount } = await streamPrompt(sid, trimmed);
        assistantIdForCleanup = assistantId;
        if (partCount === 0) {
          // Servidor fechou o stream sem emitir nenhum bloco — erro "macio".
          throw new Error(
            "O servidor nao retornou nenhum conteudo. Verifique se o provider de LLM esta configurado.",
          );
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        // Aborts originados do `stop()` do usuario sao intencionais — nao viram erro.
        const isUserStop = e.name === "AbortError" && (e as Error & { __userStop?: boolean }).__userStop;
        if (!isUserStop) {
          // Se foi stall/timeout de abort, troca a mensagem por algo legivel.
          const msg =
            e.name === "AbortError"
              ? "Tempo esgotado aguardando resposta do servidor."
              : e.message || "Falha desconhecida ao processar mensagem.";
          setError(new Error(msg));
        }
        dropEmptyAssistant(assistantIdForCleanup);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, ensureSession, streamPrompt, dropEmptyAssistant],
  );

  const handleSubmit = useCallback(
    (e?: { preventDefault?: () => void }) => {
      e?.preventDefault?.();
      const text = input;
      setInput("");
      void sendMessage(text);
    },
    [input, sendMessage],
  );

  const stop = useCallback(() => {
    const err = new Error("User stopped stream");
    err.name = "AbortError";
    (err as Error & { __userStop?: boolean }).__userStop = true;
    abortRef.current?.abort(err);
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const reload = useCallback(async () => {
    if (!lastSentRef.current) return;
    // remove a ultima mensagem do assistant (se existir) antes de re-enviar
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return last.role === "assistant" ? prev.slice(0, -1) : prev;
    });
    await sendMessage(lastSentRef.current);
  }, [sendMessage]);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    lastSentRef.current = null;
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return {
    sessionId,
    messages,
    input,
    setInput,
    isLoading,
    error,
    handleSubmit,
    sendMessage,
    stop,
    reload,
    clear,
  };
}
