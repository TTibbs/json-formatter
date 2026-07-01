"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const lineClassName =
  "font-mono text-xs leading-relaxed tabular-nums text-right";

const gutterClassName =
  "shrink-0 overflow-hidden border-r border-border/40 bg-muted/30 py-3 pl-2 pr-2.5 select-none";

const contentClassName =
  "min-h-0 min-w-0 flex-1 overflow-auto bg-transparent px-3 py-3 font-mono text-xs leading-relaxed";

/** Matches `text-xs leading-relaxed` line box height. */
const LINE_HEIGHT_PX = 19.5;
const GUTTER_PADDING_PX = 12;
/** Below this threshold, render every line number (small payloads). */
const VIRTUAL_LINE_THRESHOLD = 500;
const LINE_OVERSCAN = 8;

function useLineCount(text: string) {
  return useMemo(() => Math.max(1, text.split("\n").length), [text]);
}

function getVisibleLineRange(
  scrollTop: number,
  clientHeight: number,
  lineCount: number,
) {
  const first = Math.max(
    0,
    Math.floor((scrollTop - GUTTER_PADDING_PX) / LINE_HEIGHT_PX) -
      LINE_OVERSCAN,
  );
  const visibleCount =
    Math.ceil(clientHeight / LINE_HEIGHT_PX) + LINE_OVERSCAN * 2;
  const last = Math.min(lineCount, first + visibleCount);
  return { first, last };
}

function syncGutterScroll(
  gutterRef: React.RefObject<HTMLDivElement | null>,
  scrollTop: number,
) {
  if (gutterRef.current) {
    gutterRef.current.scrollTop = scrollTop;
  }
}

function useScrollContainerMetrics(
  containerRef: React.RefObject<HTMLElement | null>,
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      setClientHeight(el.clientHeight);
      setScrollTop(el.scrollTop);
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
    [],
  );

  return { scrollTop, clientHeight, handleScroll };
}

function LineNumberGutter({
  gutterRef,
  lineCount,
  scrollTop = 0,
  clientHeight = 0,
}: {
  gutterRef: React.RefObject<HTMLDivElement | null>;
  lineCount: number;
  scrollTop?: number;
  clientHeight?: number;
}) {
  const virtual = lineCount > VIRTUAL_LINE_THRESHOLD;
  const totalHeight = GUTTER_PADDING_PX * 2 + lineCount * LINE_HEIGHT_PX;

  if (!virtual) {
    return (
      <div ref={gutterRef} className={gutterClassName} aria-hidden>
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i + 1}
            className={cn(lineClassName, "text-muted-foreground/50")}
          >
            {i + 1}
          </div>
        ))}
      </div>
    );
  }

  const { first, last } = getVisibleLineRange(
    scrollTop,
    clientHeight,
    lineCount,
  );

  return (
    <div
      ref={gutterRef}
      className={cn(gutterClassName, "overflow-hidden")}
      aria-hidden
    >
      <div className="relative w-full" style={{ height: totalHeight }}>
        {Array.from({ length: last - first }, (_, idx) => {
          const lineNum = first + idx + 1;
          return (
            <div
              key={lineNum}
              className={cn(
                lineClassName,
                "absolute right-0 left-0 text-muted-foreground/50",
              )}
              style={{
                top: GUTTER_PADDING_PX + (lineNum - 1) * LINE_HEIGHT_PX,
                height: LINE_HEIGHT_PX,
              }}
            >
              {lineNum}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LineNumberTextarea({
  className,
  value,
  onScroll,
  ...props
}: React.ComponentProps<"textarea">) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const text = typeof value === "string" ? value : String(value ?? "");
  const lineCount = useLineCount(text);
  const virtual = lineCount > VIRTUAL_LINE_THRESHOLD;
  const { scrollTop, clientHeight, handleScroll } =
    useScrollContainerMetrics(textareaRef);

  function handleTextareaScroll(e: React.UIEvent<HTMLTextAreaElement>) {
    handleScroll(e);
    if (!virtual) {
      syncGutterScroll(gutterRef, e.currentTarget.scrollTop);
    }
    onScroll?.(e);
  }

  useEffect(() => {
    if (virtual && gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop, virtual]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <LineNumberGutter
        gutterRef={gutterRef}
        lineCount={lineCount}
        scrollTop={scrollTop}
        clientHeight={clientHeight}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onScroll={handleTextareaScroll}
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
  const preRef = useRef<HTMLPreElement>(null);
  const lineCount = useLineCount(value ?? "");
  const virtual = lineCount > VIRTUAL_LINE_THRESHOLD;
  const { scrollTop, clientHeight, handleScroll } =
    useScrollContainerMetrics(preRef);

  function handlePreScroll(e: React.UIEvent<HTMLPreElement>) {
    handleScroll(e);
    if (!virtual) {
      syncGutterScroll(gutterRef, e.currentTarget.scrollTop);
    }
  }

  useEffect(() => {
    if (virtual && gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop, virtual]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <LineNumberGutter
        gutterRef={gutterRef}
        lineCount={lineCount}
        scrollTop={scrollTop}
        clientHeight={clientHeight}
      />
      <pre
        ref={preRef}
        onScroll={handlePreScroll}
        className={cn(contentClassName, className)}
      >
        {value ?? (
          <span className="text-muted-foreground/60">{emptyMessage}</span>
        )}
      </pre>
    </div>
  );
}
