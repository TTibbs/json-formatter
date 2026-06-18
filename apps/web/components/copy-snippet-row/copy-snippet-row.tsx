"use client";

import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";
import type { CopySnippetRowProps } from "./types";

export function CopySnippetRow({
  value,
  label,
  hint,
  monospace = true,
  className,
}: CopySnippetRowProps) {
  const rowLabel = label ?? "Copy snippet";

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {label ? (
        <p className="text-sm font-medium text-foreground">{label}</p>
      ) : null}

      <div
        className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-2"
        aria-label={rowLabel}
      >
        <code
          className={cn(
            "min-w-0 flex-1 truncate text-sm text-foreground",
            monospace && "font-mono",
          )}
        >
          {value}
        </code>
        <CopyButton
          value={value}
          variant="ghost"
          size="icon-sm"
          copyLabel={`Copy ${rowLabel.toLowerCase()}`}
          copiedLabel="Copied"
        >
          <span className="sr-only">Copy</span>
        </CopyButton>
      </div>

      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
