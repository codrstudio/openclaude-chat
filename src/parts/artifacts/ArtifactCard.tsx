// ===========================================================================
// ArtifactCard — frame comum de todos os artifacts.
// Header: type icon + title + actions (copy, download, etc).
// Body: renderer específico do MIME type.
// ===========================================================================

import { useState, useCallback, useMemo, lazy, Suspense } from "react";
import {
  Code as CodeIcon,
  FileText,
  Globe,
  ImageIcon,
  GitBranch,
  Sparkles,
  Copy,
  Check,
  Download,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card.js";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../../ui/tooltip.js";
import { cn } from "../../lib/utils.js";
import { useTranslation } from "../../i18n/index.js";
import type { ArtifactPart, ArtifactType } from "../../types.js";
import { Markdown } from "../../components/Markdown.js";
import { CodeRenderer } from "./renderers/CodeRenderer.js";
import { HtmlRenderer } from "./renderers/HtmlRenderer.js";
import { SvgRenderer } from "./renderers/SvgRenderer.js";
import { ReactRenderer } from "./renderers/ReactRenderer.js";

// Mermaid lib é grande (~600KB) — carrega só quando aparece um diagrama.
const MermaidRenderer = lazy(() =>
  import("./renderers/MermaidRenderer.js").then((m) => ({ default: m.MermaidRenderer })),
);

// ─── Type metadata ────────────────────────────────────────────────────────

const TYPE_META: Record<
  ArtifactType,
  { Icon: typeof CodeIcon; label: string; downloadExt: string; downloadMime: string }
> = {
  "application/vnd.ant.code": {
    Icon: CodeIcon,
    label: "Code",
    downloadExt: "txt",
    downloadMime: "text/plain;charset=utf-8",
  },
  "text/markdown": {
    Icon: FileText,
    label: "Markdown",
    downloadExt: "md",
    downloadMime: "text/markdown;charset=utf-8",
  },
  "text/html": {
    Icon: Globe,
    label: "HTML",
    downloadExt: "html",
    downloadMime: "text/html;charset=utf-8",
  },
  "image/svg+xml": {
    Icon: ImageIcon,
    label: "SVG",
    downloadExt: "svg",
    downloadMime: "image/svg+xml;charset=utf-8",
  },
  "application/vnd.ant.mermaid": {
    Icon: GitBranch,
    label: "Mermaid",
    downloadExt: "mmd",
    downloadMime: "text/plain;charset=utf-8",
  },
  "application/vnd.ant.react": {
    Icon: Sparkles,
    label: "React",
    downloadExt: "tsx",
    downloadMime: "text/plain;charset=utf-8",
  },
};

// Tipos que têm preview vs source toggle. Code/markdown não — são "puros".
const TOGGLEABLE: ReadonlySet<ArtifactType> = new Set<ArtifactType>([
  "text/html",
  "image/svg+xml",
  "application/vnd.ant.mermaid",
  "application/vnd.ant.react",
]);

// Tipos que têm "abrir em nova aba" (precisam de blob URL pra ver standalone).
const HAS_NEW_TAB: ReadonlySet<ArtifactType> = new Set<ArtifactType>([
  "text/html",
  "image/svg+xml",
]);

// ─── Card ────────────────────────────────────────────────────────────────

export interface ArtifactCardProps {
  part: ArtifactPart;
  /** Ocultou-se este artifact porque um id mais novo o substituiu. */
  superseded?: boolean;
}

export function ArtifactCard({ part, superseded }: ArtifactCardProps) {
  const { t } = useTranslation();
  const meta = TYPE_META[part.artifactType];
  const Icon = meta?.Icon ?? CodeIcon;

  const [view, setView] = useState<"preview" | "source">(
    TOGGLEABLE.has(part.artifactType) ? "preview" : "source",
  );

  if (superseded) {
    return (
      <button
        type="button"
        className="text-xs text-muted-foreground italic px-3 py-1.5 rounded-md border border-dashed bg-muted/20 text-left hover:bg-muted/40 transition-colors"
        title="Atualizado em uma resposta posterior"
      >
        ↻ {part.title} <span className="opacity-60">— atualizado abaixo</span>
      </button>
    );
  }

  const showToggle = TOGGLEABLE.has(part.artifactType);
  const showNewTab = HAS_NEW_TAB.has(part.artifactType);

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-2 py-3 px-4 border-b bg-muted/30">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <CardTitle className="text-sm font-medium flex-1 truncate">{part.title}</CardTitle>
        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider hidden sm:inline">
          {part.language ?? meta?.label ?? ""}
        </span>
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-0.5">
            {showToggle && (
              <ToggleButton view={view} setView={setView} t={t} />
            )}
            {showNewTab && <OpenInNewTabButton part={part} t={t} />}
            <CopyButton text={part.source} t={t} />
            <DownloadButton part={part} meta={meta} t={t} />
          </div>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="p-0">
        <ArtifactBody part={part} view={view} />
      </CardContent>
    </Card>
  );
}

// ─── Body switch ─────────────────────────────────────────────────────────

function ArtifactBody({ part, view }: { part: ArtifactPart; view: "preview" | "source" }) {
  const showSource = view === "source" && TOGGLEABLE.has(part.artifactType);
  if (showSource) {
    return <CodeRenderer source={part.source} language={detectSourceLanguage(part)} />;
  }
  switch (part.artifactType) {
    case "application/vnd.ant.code":
      return <CodeRenderer source={part.source} language={part.language ?? "plaintext"} />;
    case "text/markdown":
      return (
        <div className="px-4 py-3 prose prose-sm dark:prose-invert max-w-none">
          <Markdown>{part.source}</Markdown>
        </div>
      );
    case "text/html":
      return <HtmlRenderer source={part.source} />;
    case "image/svg+xml":
      return <SvgRenderer source={part.source} />;
    case "application/vnd.ant.mermaid":
      return (
        <Suspense fallback={<div className="px-4 py-6 text-xs text-muted-foreground">…</div>}>
          <MermaidRenderer source={part.source} identifier={part.identifier} />
        </Suspense>
      );
    case "application/vnd.ant.react":
      return <ReactRenderer source={part.source} />;
    default:
      return <CodeRenderer source={part.source} language="plaintext" />;
  }
}

function detectSourceLanguage(part: ArtifactPart): string {
  switch (part.artifactType) {
    case "text/html":
      return "html";
    case "image/svg+xml":
      return "xml";
    case "application/vnd.ant.mermaid":
      return "mermaid";
    case "application/vnd.ant.react":
      return "tsx";
    case "application/vnd.ant.code":
      return part.language ?? "plaintext";
    case "text/markdown":
      return "markdown";
  }
}

// ─── Action buttons ──────────────────────────────────────────────────────

function ToggleButton({
  view,
  setView,
  t,
}: {
  view: "preview" | "source";
  setView: (v: "preview" | "source") => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const next = view === "preview" ? "source" : "preview";
  const label = next === "source" ? t("artifact.action.openSource") : t("artifact.action.openPreview");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setView(next)}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={label}
        >
          {view === "preview" ? (
            <CodeIcon className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function CopyButton({ text, t }: { text: string; t: ReturnType<typeof useTranslation>["t"] }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);
  const label = copied ? t("artifact.action.copied") : t("artifact.action.copy");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onCopy}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={label}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function DownloadButton({
  part,
  meta,
  t,
}: {
  part: ArtifactPart;
  meta: (typeof TYPE_META)[ArtifactType] | undefined;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const onDownload = useCallback(() => {
    if (!meta) return;
    const ext =
      part.artifactType === "application/vnd.ant.code" && part.language
        ? extForLang(part.language)
        : meta.downloadExt;
    const blob = new Blob([part.source], { type: meta.downloadMime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(part.identifier || part.title || "artifact")}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [part, meta]);
  const label = t("artifact.action.download");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onDownload}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={label}
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function OpenInNewTabButton({ part, t }: { part: ArtifactPart; t: ReturnType<typeof useTranslation>["t"] }) {
  const url = useMemo(() => {
    const mime =
      part.artifactType === "image/svg+xml"
        ? "image/svg+xml"
        : "text/html";
    const blob = new Blob([part.source], { type: `${mime};charset=utf-8` });
    return URL.createObjectURL(blob);
  }, [part]);
  const label = t("artifact.action.openInNewTab");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={label}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "artifact"
  );
}

function extForLang(lang: string): string {
  const map: Record<string, string> = {
    typescript: "ts",
    javascript: "js",
    tsx: "tsx",
    jsx: "jsx",
    python: "py",
    bash: "sh",
    shell: "sh",
    rust: "rs",
    go: "go",
    json: "json",
    yaml: "yaml",
    yml: "yml",
    markdown: "md",
    html: "html",
    css: "css",
    sql: "sql",
    java: "java",
    csharp: "cs",
    cpp: "cpp",
    c: "c",
    ruby: "rb",
    php: "php",
    kotlin: "kt",
    swift: "swift",
  };
  const lk = lang.toLowerCase();
  return map[lk] ?? (lk.replace(/[^a-z0-9]/g, "") || "txt");
}

// suppress unused warn (cn is convenient)
void cn;
