"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ActionMenuAction = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  variant?: "default" | "destructive";
  shortcut?: string;
  onSelect?: () => void;
};

export type ActionMenuEntry =
  | ActionMenuAction
  | { type: "separator" }
  | { type: "label"; label: string };

function normalizeEntries(entries: ActionMenuEntry[]): ActionMenuEntry[] {
  const out: ActionMenuEntry[] = [];
  let prevSep = true;
  for (const e of entries) {
    if ("type" in e && e.type === "separator") {
      if (!prevSep && out.length > 0) {
        out.push(e);
        prevSep = true;
      }
    } else {
      prevSep = false;
      out.push(e);
    }
  }
  const last = () => out[out.length - 1];
  while (
    out.length > 0 &&
    last() &&
    "type" in last()! &&
    (last() as { type: string }).type === "separator"
  ) {
    out.pop();
  }
  return out;
}

export type ActionMenuProps = {
  actions: ActionMenuEntry[];
  /** Used for the default more trigger (`aria-label` + sr-only). Default: "Actions". */
  triggerLabel?: string;
  /**
   * Custom trigger (single element). Passed as `asChild` child - must forward ref
   * and merge props from Radix (e.g. shadcn `Button`).
   */
  trigger?: React.ReactElement;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  className?: string;
  contentClassName?: string;
  triggerClassName?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
};

export function ActionMenu({
  actions,
  triggerLabel = "Actions",
  trigger,
  align = "end",
  side = "bottom",
  sideOffset = 4,
  className,
  contentClassName,
  triggerClassName,
  open,
  defaultOpen,
  onOpenChange,
  modal = true,
}: ActionMenuProps) {
  const flat = React.useMemo(() => normalizeEntries(actions), [actions]);

  return (
    <div className={cn("inline-flex", className)}>
      <DropdownMenu
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        modal={modal}
      >
        {trigger ? (
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        ) : (
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("shrink-0", triggerClassName)}
              aria-label={triggerLabel}
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">{triggerLabel}</span>
            </Button>
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent
          align={align}
          side={side}
          sideOffset={sideOffset}
          className={cn("min-w-40", contentClassName)}
        >
          {flat.map((entry, i) => {
            if ("type" in entry && entry.type === "separator") {
              return <DropdownMenuSeparator key={`sep-${i}`} />;
            }
            if ("type" in entry && entry.type === "label") {
              return (
                <DropdownMenuLabel
                  key={`label-${i}`}
                  className="text-muted-foreground text-xs font-normal"
                >
                  {entry.label}
                </DropdownMenuLabel>
              );
            }
            const a = entry as ActionMenuAction;
            return (
              <DropdownMenuItem
                key={a.id}
                disabled={a.disabled}
                variant={a.variant}
                onSelect={(e) => {
                  e.preventDefault();
                  a.onSelect?.();
                }}
              >
                {a.icon ? <span className="shrink-0">{a.icon}</span> : null}
                <span className="truncate">{a.label}</span>
                {a.shortcut ? (
                  <DropdownMenuShortcut>{a.shortcut}</DropdownMenuShortcut>
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
