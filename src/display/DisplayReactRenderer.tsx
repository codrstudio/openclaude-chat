import { memo, useEffect, useMemo, useRef, useState } from "react"
import { transform as sucraseTransform } from "sucrase"
import { SANDBOX_BOOTSTRAP } from "./react-sandbox/bootstrap.js"

// ─── Types ────────────────────────────────────────────────────────────────────

const WHITELIST_MODULES = [
  "react",
  "react-dom",
  "react-dom/client",
  "framer-motion",
  "recharts",
  "lucide-react",
] as const

type WhitelistedModule = (typeof WHITELIST_MODULES)[number]

interface ImportDecl {
  module: WhitelistedModule
  symbols: string[]
}

interface Layout {
  height?: number | "auto"
  aspectRatio?: string
  maxWidth?: number
}

export interface DisplayReactRendererProps {
  // Flattened DisplayReactSchema payload (PartRenderer spreads args as props)
  version?: "1"
  title?: string
  description?: string
  code: string
  language?: "jsx" | "tsx"
  entry?: "default"
  imports?: ImportDecl[]
  initialProps?: Record<string, unknown>
  layout?: Layout
  theme?: "light" | "dark" | "auto"
  // Sandbox bundle base — consumers can override (default: "/sandbox")
  sandboxBase?: string
}

// ─── Size limits (mirror SDK schema) ──────────────────────────────────────────

const MAX_CODE_BYTES = 8 * 1024
const MAX_PROPS_BYTES = 32 * 1024

// ─── Module-level bundle cache ────────────────────────────────────────────────

interface SandboxBundles {
  react: string
  reactDom: string
  framerMotion: string
  recharts: string
  lucideReact: string
}

const bundleCache = new Map<string, Promise<SandboxBundles>>()

function loadBundles(base: string): Promise<SandboxBundles> {
  const key = base
  const cached = bundleCache.get(key)
  if (cached) return cached
  const p = (async () => {
    const [react, reactDom, framerMotion, recharts, lucideReact] = await Promise.all([
      fetch(`${base}/react.js`).then((r) => r.text()),
      fetch(`${base}/react-dom.js`).then((r) => r.text()),
      fetch(`${base}/framer-motion.js`).then((r) => r.text()),
      fetch(`${base}/recharts.js`).then((r) => r.text()),
      fetch(`${base}/lucide-react.js`).then((r) => r.text()),
    ])
    return { react, reactDom, framerMotion, recharts, lucideReact }
  })()
  bundleCache.set(key, p)
  return p
}

// ─── Validation helpers ──────────────────────────────────────────────────────

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length
}

function validatePayload(props: DisplayReactRendererProps): string | null {
  if (!props.code || typeof props.code !== "string") return "missing code"
  if (byteLength(props.code) > MAX_CODE_BYTES) return `code exceeds ${MAX_CODE_BYTES} bytes`
  if (props.initialProps) {
    try {
      const s = JSON.stringify(props.initialProps)
      if (byteLength(s) > MAX_PROPS_BYTES) return `initialProps exceeds ${MAX_PROPS_BYTES} bytes`
    } catch {
      return "initialProps not JSON-serializable"
    }
  }
  if (props.imports) {
    for (const imp of props.imports) {
      if (!WHITELIST_MODULES.includes(imp.module)) {
        return `import not in whitelist: ${imp.module}`
      }
    }
  }
  return null
}

// ─── Transpile user code ─────────────────────────────────────────────────────

function compile(code: string, language: "jsx" | "tsx"): { ok: true; code: string } | { ok: false; error: string } {
  try {
    const transforms: ("jsx" | "typescript" | "imports")[] = ["jsx", "imports"]
    if (language === "tsx") transforms.unshift("typescript")
    const out = sucraseTransform(code, {
      transforms,
      production: true,
      jsxRuntime: "classic",
    })
    return { ok: true, code: out.code }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ─── Build srcdoc ────────────────────────────────────────────────────────────

function buildSrcDoc(bundles: SandboxBundles): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;}
  body{font:14px/1.5 system-ui,-apple-system,sans-serif;padding:12px;box-sizing:border-box;}
  #root{min-height:0;}
  *{box-sizing:border-box;}
</style></head><body><div id="root"></div>
<script>${bundles.react}<\/script>
<script>${bundles.reactDom}<\/script>
<script>${bundles.framerMotion}<\/script>
<script>${bundles.recharts}<\/script>
<script>${bundles.lucideReact}<\/script>
<script>${SANDBOX_BOOTSTRAP}<\/script>
</body></html>`
}

// ─── Component ───────────────────────────────────────────────────────────────

export const DisplayReactRenderer = memo(function DisplayReactRenderer(props: DisplayReactRendererProps) {
  const {
    code,
    language = "jsx",
    initialProps,
    layout,
    theme = "auto",
    title,
    description,
    sandboxBase = "/sandbox",
  } = props

  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [height, setHeight] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  // Validate + compile once per payload
  const compiled = useMemo<{ ok: true; code: string } | { ok: false; error: string }>(() => {
    const validationError = validatePayload(props)
    if (validationError) return { ok: false, error: validationError }
    return compile(code, language)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, language, JSON.stringify(props.imports), JSON.stringify(initialProps)])

  // Build + inject srcdoc once bundles are available
  useEffect(() => {
    if (compiled.ok === false) {
      setError(compiled.error)
      setStatus("error")
      return
    }
    let cancelled = false
    loadBundles(sandboxBase)
      .then((bundles) => {
        if (cancelled) return
        const iframe = iframeRef.current
        if (!iframe) return
        iframe.srcdoc = buildSrcDoc(bundles)
      })
      .catch((e) => {
        if (cancelled) return
        setError(`failed to load sandbox bundles: ${e instanceof Error ? e.message : String(e)}`)
        setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [compiled, sandboxBase])

  // postMessage pump: wait for sandbox-boot → send compiled code. Also capture height + ready.
  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      const iframe = iframeRef.current
      if (!iframe || ev.source !== iframe.contentWindow) return
      const data = ev.data as { type?: string; height?: number } | undefined
      if (!data || typeof data !== "object" || !data.type) return
      if (data.type === "sandbox-boot") {
        if (!compiled.ok) return
        iframe.contentWindow?.postMessage(
          {
            type: "sandbox-render",
            compiledCode: compiled.code,
            payload: {
              initialProps: initialProps ?? {},
              theme,
            },
          },
          "*",
        )
      } else if (data.type === "sandbox-ready") {
        setStatus("ready")
      } else if (data.type === "sandbox-height" && typeof data.height === "number") {
        if (layout?.height !== "auto" && typeof layout?.height === "number") return
        setHeight(data.height + 24) // padding from body
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [compiled, initialProps, theme, layout?.height])

  // Compute iframe style
  const iframeStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: layout?.maxWidth ? `${layout.maxWidth}px` : undefined,
    aspectRatio: layout?.aspectRatio,
    height:
      typeof layout?.height === "number"
        ? `${layout.height}px`
        : height !== null
          ? `${height}px`
          : "120px",
    border: "1px solid var(--border, #e5e5e5)",
    borderRadius: "8px",
    display: "block",
    background: "var(--bg, #fff)",
  }

  if (error || (compiled.ok === false)) {
    const msg = error ?? (compiled.ok === false ? compiled.error : "unknown")
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 text-red-900 p-3 text-xs">
        <div className="font-semibold mb-1">React sandbox error</div>
        <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">{msg}</pre>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {(title || description) && (
        <div className="flex flex-col gap-0.5 px-0.5">
          {title && <div className="text-sm font-semibold text-foreground">{title}</div>}
          {description && <div className="text-xs text-muted-foreground">{description}</div>}
        </div>
      )}
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        title={title ?? "react sandbox"}
        style={iframeStyle}
        aria-busy={status === "loading"}
      />
    </div>
  )
})
