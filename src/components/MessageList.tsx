import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { useRef, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Sparkles } from "lucide-react";
import type { Message } from "../types.js";
import { MessageBubble } from "./MessageBubble.js";
import { StreamingIndicator } from "./StreamingIndicator.js";
import { ErrorNote } from "./ErrorNote.js";
import type { DisplayRendererMap } from "../display/registry.js";
import { ScrollBar } from "../ui/scroll-area.js";
import { cn } from "../lib/utils.js";

export interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  displayRenderers?: DisplayRendererMap;
  className?: string;
  error?: Error;
  onRetry?: () => void;
  emptyState?: ReactNode;
}

function DefaultWelcome() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Sparkles className="size-7" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight">Como posso ajudar?</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Envie uma mensagem para comecar a conversa. Voce pode pedir respostas, acionar ferramentas ou colar conteudo para analise.
        </p>
      </div>
    </div>
  );
}

export function MessageList({ messages, isLoading, displayRenderers,className, error, onRetry, emptyState }: MessageListProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const isFollowingRef = useRef(true);

  const lastAssistantIndex = useMemo(() =>
    messages.reduceRight((found, msg, i) => {
      if (found !== -1) return found;
      return msg.role === "assistant" ? i : -1;
    }, -1),
    [messages]
  );

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => 80,
    overscan: 5,
    paddingStart: 16,
  });

  // Track scroll position to detect if user is following
  const handleScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    isFollowingRef.current = distanceFromBottom <= 100;
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Auto-scroll to bottom when following
  useEffect(() => {
    if (messages.length > 0 && isFollowingRef.current) {
      virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
    }
  }, [messages, virtualizer]);

  // Auto-scroll when error appears
  useEffect(() => {
    if (error && isFollowingRef.current) {
      const viewport = viewportRef.current;
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [error]);

  const virtualItems = virtualizer.getVirtualItems();

  if (messages.length === 0) {
    return (
      <ScrollAreaPrimitive.Root className={cn("flex-1 relative overflow-hidden", className)}>
        <ScrollAreaPrimitive.Viewport ref={viewportRef} className="h-full w-full rounded-[inherit]">
          {emptyState ?? <DefaultWelcome />}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>
    );
  }

  return (
    <ScrollAreaPrimitive.Root className={cn("flex-1 relative overflow-hidden", className)}>
      <ScrollAreaPrimitive.Viewport ref={viewportRef} className="h-full w-full rounded-[inherit]">
        <div
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() + 16 }}
        >
          <div>
            {virtualItems.map((virtualRow) => {
              const message = messages[virtualRow.index];
              return (
                <div
                  key={message.id ?? virtualRow.index}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="pb-3 px-4"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <MessageBubble
                    message={message}
                    isStreaming={virtualRow.index === lastAssistantIndex && isLoading && messages[messages.length - 1]?.role === "assistant"}
                    displayRenderers={displayRenderers}
                  />
                </div>
              );
            })}
          </div>
        </div>
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="px-4 pb-3">
            <StreamingIndicator />
          </div>
        )}
        {!isLoading && error && (
          <div className="px-4 pb-3">
            <ErrorNote message={error.message} onRetry={onRetry} />
          </div>
        )}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}
