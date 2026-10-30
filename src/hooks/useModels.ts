import { useEffect, useState } from "react";

export interface ModelEntry {
  id: string;
  label: string;
  owned_by: string;
  context_window?: number | null;
  supports_vision?: boolean | null;
}

export interface UseModelsReturn {
  models: ModelEntry[];
  defaultModel: string | null;
  isLoading: boolean;
}

const cache = new Map<string, { models: ModelEntry[]; defaultModel: string | null }>();

function cacheKey(endpoint: string, token?: string): string {
  return token ? `${endpoint}|${token}` : endpoint;
}

export function useModels(
  endpoint: string,
  fetcher?: typeof fetch,
  token?: string,
): UseModelsReturn {
  const key = cacheKey(endpoint, token);
  const [models, setModels] = useState<ModelEntry[]>(() => cache.get(key)?.models ?? []);
  const [defaultModel, setDefaultModel] = useState<string | null>(() => cache.get(key)?.defaultModel ?? null);
  const [isLoading, setIsLoading] = useState(!!endpoint && !cache.has(key));

  useEffect(() => {
    if (!endpoint || cache.has(key)) return;

    let cancelled = false;
    const doFetch = fetcher ?? fetch;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    doFetch(`${endpoint}/models`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { data?: Array<{ id: string; label?: string; owned_by?: string; context_window?: number; supports_vision?: boolean }>; default_model?: string }) => {
        if (cancelled) return;
        const entries: ModelEntry[] = (data.data ?? []).map((m) => ({
          id: m.id,
          label: m.label ?? m.id,
          owned_by: m.owned_by ?? "unknown",
          context_window: m.context_window ?? null,
          supports_vision: m.supports_vision ?? null,
        }));
        const def = data.default_model ?? null;
        cache.set(key, { models: entries, defaultModel: def });
        setModels(entries);
        setDefaultModel(def);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [endpoint, fetcher, token, key]);

  return { models, defaultModel, isLoading };
}
