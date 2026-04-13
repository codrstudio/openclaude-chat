import React, { useCallback, useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Star, StarOff } from "lucide-react";
import { cn } from "../lib/utils.js";
import { Button } from "../ui/button.js";
import { LocaleSelect } from "./LocaleSelect.js";
import { useTranslation } from "../i18n/index.js";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../ui/tooltip.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.js";

export interface ChatHeaderProps {
  /** Conversation title. When undefined, session-dependent elements are hidden. */
  title?: string;
  /** Whether the conversation is starred/bookmarked. */
  starred?: boolean;
  /** Called when user toggles the star. */
  onToggleStar?: () => void;
  /** Called when user renames the conversation. */
  onRename?: (title: string) => void;
  /** Current locale slug. */
  locale?: string;
  /** Called when user changes locale. */
  onLocaleChange?: (locale: string) => void;
  /** Show locale selector. Mirrors the Chat component flag. */
  enableLocaleSelect?: boolean;
  className?: string;
}

export function ChatHeader({
  title,
  starred,
  onToggleStar,
  onRename,
  locale,
  onLocaleChange,
  enableLocaleSelect = true,
  className,
}: ChatHeaderProps) {
  const { t } = useTranslation();
  const hasSession = title !== undefined;
  const [isRenaming, setIsRenaming] = useState(false);
  const [draft, setDraft] = useState(title ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setDraft(title ?? "");
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isRenaming, title]);

  const commitRename = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== title) {
      onRename?.(trimmed);
    }
    setIsRenaming(false);
  }, [draft, title, onRename]);

  const cancelRename = useCallback(() => {
    setDraft(title ?? "");
    setIsRenaming(false);
  }, [title]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitRename();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelRename();
      }
    },
    [commitRename, cancelRename],
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex h-14 shrink-0 items-center justify-between border-b px-3",
          className,
        )}
      >
        {/* Left: star + title (only when session exists) */}
        <div className="flex min-w-0 items-center gap-1.5">
          {hasSession && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={onToggleStar}
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        starred
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground",
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {starred ? t("history.unfavorite") : t("history.favorite")}
                </TooltipContent>
              </Tooltip>
              {isRenaming ? (
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleKeyDown}
                  className="min-w-0 flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              ) : (
                <span className="truncate text-sm font-medium">{title}</span>
              )}
            </>
          )}
        </div>

        {/* Right: locale selector + menu */}
        <div className="flex shrink-0 items-center gap-0.5">
          {enableLocaleSelect && locale && onLocaleChange && (
            <LocaleSelect value={locale} onChange={onLocaleChange} />
          )}
          {hasSession && !isRenaming && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("history.rename")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleStar}>
                  {starred ? (
                    <>
                      <StarOff className="mr-2 h-4 w-4" />
                      {t("history.unfavorite")}
                    </>
                  ) : (
                    <>
                      <Star className="mr-2 h-4 w-4" />
                      {t("history.favorite")}
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
