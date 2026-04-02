import { useState, useCallback, useEffect } from "react";
import type { Conversation } from "./types.js";

export interface UseConversationsOptions {
  endpoint?: string;
  token?: string;
  fetcher?: (url: string, init?: RequestInit) => Promise<Response>;
  autoFetch?: boolean;
}

export interface UseConversationsReturn {
  conversations: Conversation[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (agentId: string) => Promise<Conversation>;
  rename: (id: string, title: string) => Promise<void>;
  star: (id: string, starred: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
  exportUrl: (id: string, format?: "json" | "markdown") => string;
}

export function useConversations(options: UseConversationsOptions = {}): UseConversationsReturn {
  const { endpoint = "", token, fetcher, autoFetch = true } = options;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const doFetch = useCallback(
    (url: string, init?: RequestInit) => {
      const fn = fetcher ?? fetch;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string> | undefined),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      return fn(url, { ...init, headers });
    },
    [fetcher, token],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await doFetch(`${endpoint}/api/v1/ai/conversations`);
      if (!res.ok) throw new Error(`Failed to fetch conversations: ${res.status}`);
      const data = (await res.json()) as Conversation[];
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [doFetch, endpoint]);

  useEffect(() => {
    if (autoFetch) {
      void refresh();
    }
  }, [autoFetch, refresh]);

  const create = useCallback(
    async (agentId: string): Promise<Conversation> => {
      const res = await doFetch(`${endpoint}/api/v1/ai/conversations`, {
        method: "POST",
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) throw new Error(`Failed to create conversation: ${res.status}`);
      const created = (await res.json()) as Conversation;
      setConversations((prev) => [created, ...prev]);
      return created;
    },
    [doFetch, endpoint],
  );

  const rename = useCallback(
    async (id: string, title: string): Promise<void> => {
      const res = await doFetch(`${endpoint}/api/v1/ai/conversations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error(`Failed to rename conversation: ${res.status}`);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c)),
      );
    },
    [doFetch, endpoint],
  );

  const star = useCallback(
    async (id: string, starred: boolean): Promise<void> => {
      // Optimistic update
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, starred } : c)),
      );
      try {
        const res = await doFetch(`${endpoint}/api/v1/ai/conversations/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ starred }),
        });
        if (!res.ok) throw new Error(`Failed to star conversation: ${res.status}`);
      } catch (err) {
        // Rollback on error
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, starred: !starred } : c)),
        );
        throw err;
      }
    },
    [doFetch, endpoint],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      const res = await doFetch(`${endpoint}/api/v1/ai/conversations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
    },
    [doFetch, endpoint],
  );

  const exportUrl = useCallback(
    (id: string, format: "json" | "markdown" = "json"): string => {
      const params = new URLSearchParams({ format });
      if (token) params.set("token", token);
      return `${endpoint}/api/v1/ai/conversations/${id}/export?${params.toString()}`;
    },
    [endpoint, token],
  );

  return {
    conversations,
    isLoading,
    error,
    refresh,
    create,
    rename,
    star,
    remove,
    exportUrl,
  };
}
