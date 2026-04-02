"use client";

import * as React from "react";
import { ArrowLeft, Download, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Badge } from "../ui/badge.js";
import { Button } from "../ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.js";
import { Skeleton } from "../ui/skeleton.js";
import { cn } from "../lib/utils.js";
import { DeleteDialog } from "./DeleteDialog.js";
import { RenameDialog } from "./RenameDialog.js";

interface ConversationBarProps {
  // Data
  title?: string;
  agentLabel?: string;
  isLoading?: boolean;

  // Actions
  onRename?: (title: string) => void;
  onExport?: () => void;
  onDelete?: () => void;
  onBack?: () => void;

  // Controlled dialog state (optional — uncontrolled if not provided)
  renameOpen?: boolean;
  onRenameOpenChange?: (open: boolean) => void;
  deleteOpen?: boolean;
  onDeleteOpenChange?: (open: boolean) => void;

  // Pending states
  isPendingRename?: boolean;
  isPendingDelete?: boolean;

  // Labels
  renameLabel?: string;
  exportLabel?: string;
  deleteLabel?: string;
  untitledLabel?: string;

  // Extension slots
  actionsExtra?: React.ReactNode;
  menuItemsExtra?: React.ReactNode;
  afterBar?: React.ReactNode;

  // Layout
  className?: string;
}

function ConversationBar({
  title,
  agentLabel,
  isLoading,
  onRename,
  onExport,
  onDelete,
  onBack,
  renameOpen: renameOpenProp,
  onRenameOpenChange,
  deleteOpen: deleteOpenProp,
  onDeleteOpenChange,
  isPendingRename,
  isPendingDelete,
  renameLabel = "Rename",
  exportLabel = "Export",
  deleteLabel = "Delete",
  untitledLabel = "Untitled",
  actionsExtra,
  menuItemsExtra,
  afterBar,
  className,
}: ConversationBarProps) {
  // Internal dialog state for uncontrolled mode
  const [internalRenameOpen, setInternalRenameOpen] = React.useState(false);
  const [internalDeleteOpen, setInternalDeleteOpen] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState("");

  const isControlledRename = renameOpenProp !== undefined && onRenameOpenChange !== undefined;
  const isControlledDelete = deleteOpenProp !== undefined && onDeleteOpenChange !== undefined;

  const renameOpen = isControlledRename ? renameOpenProp : internalRenameOpen;
  const deleteOpen = isControlledDelete ? deleteOpenProp : internalDeleteOpen;

  const setRenameOpen = (open: boolean) => {
    if (isControlledRename) {
      onRenameOpenChange(open);
    } else {
      setInternalRenameOpen(open);
    }
  };

  const setDeleteOpen = (open: boolean) => {
    if (isControlledDelete) {
      onDeleteOpenChange(open);
    } else {
      setInternalDeleteOpen(open);
    }
  };

  const handleRenameClick = () => {
    setRenameValue(title ?? "");
    setRenameOpen(true);
  };

  const handleRenameConfirm = () => {
    if (renameValue.trim()) {
      onRename?.(renameValue.trim());
    }
    setRenameOpen(false);
  };

  const handleDeleteConfirm = () => {
    onDelete?.();
    setDeleteOpen(false);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-2 border-b bg-background px-3 py-2">
        {onBack && (
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-2">
          {isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <span className="truncate text-sm font-medium">{title ?? untitledLabel}</span>
          )}
          {agentLabel && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {agentLabel}
            </Badge>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {actionsExtra}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRenameClick}>
                <Pencil className="mr-2 size-4" />
                {renameLabel}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <Download className="mr-2 size-4" />
                {exportLabel}
              </DropdownMenuItem>
              {menuItemsExtra}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 size-4" />
                {deleteLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {afterBar}

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        value={renameValue}
        onValueChange={setRenameValue}
        onConfirm={handleRenameConfirm}
        isPending={isPendingRename}
      />

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
        isPending={isPendingDelete}
      />
    </div>
  );
}

export { ConversationBar };
export type { ConversationBarProps };
