import { memo, useState } from "react";
import { Paperclip, ChevronDown } from "lucide-react";
import { Markdown } from "../components/Markdown.js";
import { LazyRender } from "../components/LazyRender.js";
import { ReasoningBlock } from "./ReasoningBlock.js";
import { ToolActivity } from "./ToolActivity.js";
import { ToolResult } from "./ToolResult.js";
import { resolveDisplayRenderer } from "../display/registry.js";
import type { DisplayRendererMap } from "../display/registry.js";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../ui/collapsible.js";
import { cn } from "../lib/utils.js";
import { useTranslation } from "../i18n/index.js";
import type { MessagePart, TextPart, ReasoningPart, ToolInvocationPart } from "../types.js";

const HEAVY_RENDERERS = new Set([
  "chart", "map", "table",
  "spreadsheet", "gallery", "image",
]);

export interface PartRendererProps {
  part: MessagePart;
  isStreaming?: boolean;
  displayRenderers?: DisplayRendererMap;
}

// ─── Attachment sub-components ────────────────────────────────────────────────

function AttachmentTextBlock({ filename, content }: { filename: string; content: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const lines = content.split("\n");
  const preview = lines.slice(0, 3).join("\n") + (lines.length > 3 && !open ? "\n…" : "");

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border text-xs overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
        <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate font-medium">{filename}</span>
        <CollapsibleTrigger asChild>
          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label={open ? t("part.collapse") : t("part.expand")}>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
      </div>
      <pre className="px-3 py-2 text-muted-foreground whitespace-pre-wrap break-words">{preview}</pre>
      <CollapsibleContent>
        <pre className="px-3 py-2 max-h-40 overflow-auto whitespace-pre-wrap break-words border-t">{content}</pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export const PartRenderer = memo(function PartRenderer({ part, isStreaming, displayRenderers }: PartRendererProps) {
  switch (part.type) {
    case "text": {
      const p = part as TextPart;
      if (p.text.startsWith("[📎")) {
        const firstNewline = p.text.indexOf("\n");
        const header = firstNewline >= 0 ? p.text.slice(0, firstNewline) : p.text;
        const body = firstNewline >= 0 ? p.text.slice(firstNewline + 1) : "";
        const match = header.match(/^\[📎\s+(.+?)\]?$/);
        const filename = match?.[1] ?? header;
        return <AttachmentTextBlock filename={filename} content={body} />;
      }
      return <Markdown>{p.text}</Markdown>;
    }

    case "reasoning": {
      const p = part as ReasoningPart;
      return <ReasoningBlock content={p.reasoning} isStreaming={isStreaming} />;
    }

    case "tool-invocation": {
      const { toolInvocation } = part as ToolInvocationPart;
      // O openclaude-sdk entrega os display tools como meta-tools MCP com
      // prefixo `mcp__display__display_*` (ex: mcp__display__display_highlight).
      // O tipo especifico do widget vem no campo `action` do input/args
      // (ex: {action: "metric", label: "...", value: "..."}).
      //
      // Alem disso aceitamos a forma "legada" direta `display_*` (compat).
      const name = toolInvocation.toolName;
      const isMcpDisplay = /^mcp__display__display_(highlight|collection|card|visual)$/.test(name);
      const isLegacyDisplay = name.startsWith("display_");
      const isDisplay = isMcpDisplay || isLegacyDisplay;

      if (isDisplay) {
        // IMPORTANTE: para display tools, o `args` (input) contem a definicao
        // COMPLETA do widget. O `result` (tool_result) e apenas uma confirmacao
        // minima (`{action: "metric"}`). Sempre preferimos args aqui.
        const payload = toolInvocation.args as Record<string, unknown> | undefined;
        // Para meta-tools MCP, a action vem no payload.
        // Para display_* legado, a action e o sufixo do toolName.
        const action = isMcpDisplay
          ? (payload?.action as string | undefined)
          : name.replace(/^display_/, "");
        const Renderer = action ? resolveDisplayRenderer(action, displayRenderers) : null;
        if (payload && Renderer && action) {
          // Alguns campos complexos (ex: trend, data) podem chegar serializados
          // como JSON string se o modelo nao souber passar objetos. Tentamos
          // parsear string → objeto antes de spreadar no renderer.
          const normalized: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(payload)) {
            if (typeof v === "string" && (v.startsWith("{") || v.startsWith("["))) {
              try {
                normalized[k] = JSON.parse(v);
              } catch {
                normalized[k] = v;
              }
            } else {
              normalized[k] = v;
            }
          }
          // key by toolCallId so iframe-based renderers (DisplayReactRenderer)
          // unmount/remount cleanly when a new tool_use block arrives.
          const rendered = <Renderer key={toolInvocation.toolCallId} {...normalized} />;
          // NOTE: LazyRender via IntersectionObserver nao funciona bem dentro
          // do virtualized MessageList (itens ficam position:absolute e o
          // observer nao dispara consistente). Renderizamos direto.
          return rendered;
        }
      }

      if (toolInvocation.state === "result") {
        if (toolInvocation.result != null) {
          return (
            <ToolResult
              toolName={toolInvocation.toolName}
              result={toolInvocation.result}
              isError={toolInvocation.isError}
            />
          );
        }
        return (
          <ToolActivity
            toolName={toolInvocation.toolName}
            state="result"
            args={toolInvocation.args}
          />
        );
      }

      return (
        <ToolActivity
          toolName={toolInvocation.toolName}
          state={toolInvocation.state}
          args={toolInvocation.args}
        />
      );
    }

    default:
      return null;
  }
});
