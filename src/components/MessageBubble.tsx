import { memo, useState, useCallback } from "react";
import type { Message } from "../types.js";
import { cn } from "../lib/utils.js";
import { Markdown } from "./Markdown.js";
import { StreamingIndicator } from "./StreamingIndicator.js";
import { PartRenderer } from "../parts/PartRenderer.js";
import { PartErrorBoundary } from "../parts/PartErrorBoundary.js";
import type { DisplayRendererMap } from "../display/registry.js";
import { Copy, Check } from "lucide-react";
import { useTranslation } from "../i18n/index.js";

export interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  displayRenderers?: DisplayRendererMap;
  className?: string;
}

function extractText(message: Message): string {
  if (message.content) return message.content;
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => (p as { type: string }).type === "text")
    .map((p) => p.text)
    .join("\n");
}

function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded-lg transition-all",
        "text-muted-foreground/50 opacity-0 group-hover/bubble:opacity-100",
        "hover:bg-muted/50 hover:text-muted-foreground",
      )}
      aria-label={copied ? t("bubble.copied") : t("bubble.copy")}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function EmptyResponse() {
  const { t } = useTranslation();
  return <span className="text-xs italic text-muted-foreground">{t("bubble.emptyResponse")}</span>;
}

export const MessageBubble = memo(function MessageBubble({ message, isStreaming, displayRenderers, className }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasParts = Array.isArray(message.parts) && message.parts.length > 0;
  const hasText = typeof message.content === "string" && message.content.length > 0;
  const isEmptyAssistant = !isUser && !hasParts && !hasText && !isStreaming;

  return (
    <div className={cn("group/bubble", isUser ? "flex flex-col items-end" : "flex flex-col items-start")}>
      {/* Bubble */}
      <div
        className={cn(
          "min-w-0 overflow-hidden",
          isUser
            ? "max-w-[80%] rounded-lg rounded-br-sm bg-muted text-foreground px-4 py-2.5"
            : "w-full text-foreground py-1",
          className
        )}
      >
        {hasParts
          ? <div className="flex flex-col gap-3">
              {(message.parts as { type: string }[]).map((part, i) => (
                <PartErrorBoundary key={i} label={`part:${part.type}`}>
                  <PartRenderer
                    part={part as Parameters<typeof PartRenderer>[0]["part"]}
                    isStreaming={isStreaming}
                    displayRenderers={displayRenderers}
                  />
                </PartErrorBoundary>
              ))}
            </div>
          : hasText
            ? <Markdown>{message.content}</Markdown>
            : isEmptyAssistant
              ? <EmptyResponse />
              : null
        }
        {isStreaming && !isUser && <StreamingIndicator />}
      </div>

      {/* Action bar — outside bubble, below */}
      {!isStreaming && (
        <div className={cn(
          "flex items-center gap-0.5 mt-0.5",
          isUser ? "justify-end" : "justify-start"
        )}>
          <CopyButton text={extractText(message)} />
        </div>
      )}
    </div>
  );
}, (prev, next) =>
  prev.message === next.message
  && prev.isStreaming === next.isStreaming
  && prev.displayRenderers === next.displayRenderers
  && prev.className === next.className
);
