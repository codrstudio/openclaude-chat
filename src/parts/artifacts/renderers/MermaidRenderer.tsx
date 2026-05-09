// Mermaid — lazy-loaded em ArtifactCard. Renderiza source pra SVG via
// mermaid.render(). Em caso de parse error, mostra a mensagem do mermaid.

import { useEffect, useState } from "react";

let mermaidInited = false;
async function ensureMermaid(): Promise<typeof import("mermaid")["default"]> {
  const mod = await import("mermaid");
  const m = mod.default;
  if (!mermaidInited) {
    m.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "default",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
    });
    mermaidInited = true;
  }
  return m;
}

export function MermaidRenderer({ source, identifier }: { source: string; identifier: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setSvg(null);
    ensureMermaid()
      .then(async (m) => {
        try {
          const id = `mermaid-${identifier.replace(/[^a-z0-9_-]/gi, "-")}-${Math.random().toString(36).slice(2, 8)}`;
          const result = await m.render(id, source);
          if (!cancelled) setSvg(result.svg);
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : String(err));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [source, identifier]);

  if (error) {
    return (
      <div className="px-4 py-3 text-xs text-destructive">
        <div className="font-medium mb-1">Erro do Mermaid</div>
        <pre className="whitespace-pre-wrap break-words font-mono opacity-80">{error}</pre>
      </div>
    );
  }
  if (!svg) {
    return <div className="px-4 py-6 text-xs text-muted-foreground">Renderizando…</div>;
  }
  return (
    <div
      className="w-full flex items-center justify-center bg-white p-4 overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
