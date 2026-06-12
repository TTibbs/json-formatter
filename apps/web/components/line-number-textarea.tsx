"use client";

import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

const lineClassName =
  "font-mono text-xs leading-relaxed tabular-nums text-right";

const gutterClassName =
  "shrink-0 overflow-hidden border-r border-border/40 bg-muted/30 py-3 pl-2 pr-2.5 select-none";

const contentClassName =
  "min-h-0 min-w-0 flex-1 overflow-auto bg-transparent px-3 py-3 font-mono text-xs leading-relaxed";

function useLineCount(text: string) {
  return useMemo(() => Math.max(1, text.split("\n").length), [text]);
}

function LineNumberGutter({
  gutterRef,
  lineCount,
}: {
  gutterRef: React.RefObject<HTMLDivElement | null>;
  lineCount: number;
}) {
  return (
    <div ref={gutterRef} className={gutterClassName} aria-hidden>
      {Array.from({ length: lineCount }, (_, i) => (
        <div key={i + 1} className={cn(lineClassName, "text-muted-foreground/50")}>
          {i + 1}
        </div>
      ))}
    </div>
  );
}

function syncGutterScroll(
  gutterRef: React.RefObject<HTMLDivElement | null>,
  scrollTop: number,
) {
  if (gutterRef.current) {
    gutterRef.current.scrollTop = scrollTop;
  }
}
export function LineNumberTextarea({
  className,
  value,
  onScroll,
  ...props
}: React.ComponentProps<"textarea">) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const text = typeof value === "string" ? value : String(value ?? "");
  const lineCount = useLineCount(text);

  function handleScroll(e: React.UIEvent<HTMLTextAreaElement>) {
    syncGutterScroll(gutterRef, e.currentTarget.scrollTop);
    onScroll?.(e);
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <LineNumberGutter gutterRef={gutterRef} lineCount={lineCount} />
      <textarea
        value={value}
        onScroll={handleScroll}
        className={cn(
          contentClassName,
          "resize-none outline-none placeholder:text-muted-foreground/50",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function LineNumberPre({
  value,
  emptyMessage,
  className,
}: {
  value: string | null;
  emptyMessage?: React.ReactNode;
  className?: string;
}) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const lineCount = useLineCount(value ?? "");

  function handleScroll(e: React.UIEvent<HTMLPreElement>) {
    syncGutterScroll(gutterRef, e.currentTarget.scrollTop);
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <LineNumberGutter gutterRef={gutterRef} lineCount={lineCount} />
      <pre onScroll={handleScroll} className={cn(contentClassName, className)}>
        {value ?? (
          <span className="text-muted-foreground/60">{emptyMessage}</span>
        )}
      </pre>
    </div>
  );
}
