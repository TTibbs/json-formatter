"use client";

import { useMemo, useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DiffLineProps, HighlightStyle } from "./types";
import {
  computeDiffRows,
  countDiffStats,
  PLACEHOLDER_LINE,
  rowsToInlineLines,
} from "./utils";

// CVA variants for the container
const diffViewerVariants = cva(
  "relative overflow-hidden rounded-xl border font-mono text-sm",
  {
    variants: {
      variant: {
        default: "border-border bg-card",
        ghost: "border-transparent bg-transparent",
        elevated: "border-border bg-card shadow-lg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const paneScrollClassName =
  "min-w-0 overflow-x-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/80";

const DiffLineComponent = ({
  line,
  rowId,
  showLineNumbers,
  isHovered,
  isPlaceholder = false,
  onHover,
  highlightStyle,
}: DiffLineProps) => {
  const lineTypeStyles = {
    addition: "bg-emerald-500/10 dark:bg-emerald-500/15",
    removal: "bg-red-500/10 dark:bg-red-500/15",
    unchanged: "",
  };

  const segmentStyles = {
    addition:
      "bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 rounded px-0.5",
    removal:
      "bg-red-500/25 text-red-700 dark:text-red-300 rounded px-0.5 line-through decoration-red-500/50",
    unchanged: "text-foreground",
  };

  return (
    <div
      className={cn(
        "flex min-h-7 transition-colors duration-150",
        !isPlaceholder && lineTypeStyles[line.type],
        isHovered && "ring-1 ring-inset ring-primary/30",
      )}
      onMouseEnter={() => onHover(rowId)}
      onMouseLeave={() => onHover(null)}
    >
      {showLineNumbers && (
        <span className="flex w-12 shrink-0 select-none items-center justify-end border-r border-border/50 pr-3 text-xs text-muted-foreground/60">
          {isPlaceholder ? "" : line.lineNumber}
        </span>
      )}
      <span className="block flex-1 whitespace-pre px-4 py-1">
        {isPlaceholder ? (
          "\u00A0"
        ) : highlightStyle === "word" ? (
          line.segments.map((segment, idx) => (
            <span
              key={`${rowId}-seg-${idx}-${segment.type}`}
              className={segmentStyles[segment.type]}
            >
              {segment.text}
            </span>
          ))
        ) : (
          <span
            className={
              line.type !== "unchanged" ? segmentStyles[line.type] : ""
            }
          >
            {line.segments.map((s) => s.text).join("")}
          </span>
        )}
      </span>
    </div>
  );
};

// Icons
const SplitIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="18" rx="1" />
      <rect x="14" y="3" width="7" height="18" rx="1" />
    </svg>
  );
};

const InlineIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  );
};

// Props interface
export interface DiffViewerProps
  extends VariantProps<typeof diffViewerVariants> {
  variant?: "default" | "ghost" | "elevated";
  original: string;
  updated: string;
  splitView?: boolean;
  showLineNumbers?: boolean;
  highlightStyle?: HighlightStyle;
  className?: string;
}

export function DiffViewer({
  original,
  updated,
  splitView: initialSplitView = true,
  showLineNumbers = true,
  highlightStyle: initialHighlightStyle = "word",
  variant,
  className,
}: DiffViewerProps) {
  const [splitView, setSplitView] = useState(initialSplitView);
  const [highlightStyle, setHighlightStyle] = useState<HighlightStyle>(
    initialHighlightStyle,
  );
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const rows = useMemo(
    () => computeDiffRows(original, updated, highlightStyle === "word"),
    [original, updated, highlightStyle],
  );

  const inlineLines = useMemo(() => rowsToInlineLines(rows), [rows]);
  const { removals, additions } = useMemo(() => countDiffStats(rows), [rows]);

  return (
    <div className={cn(diffViewerVariants({ variant }), className)}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-muted/50 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Diff View
          </span>
          <span className="text-xs text-muted-foreground/60">
            {removals} removals, {additions} additions
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-border/50 bg-background p-0.5">
            <Button
              variant={splitView ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setSplitView(true)}
              aria-label="Split view"
            >
              <SplitIcon className="size-3.5" />
              Split
            </Button>
            <Button
              variant={!splitView ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setSplitView(false)}
              aria-label="Inline view"
            >
              <InlineIcon className="size-3.5" />
              Inline
            </Button>
          </div>

          {/* Highlight Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border/50 bg-background p-0.5">
            <Button
              variant={highlightStyle === "word" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setHighlightStyle("word")}
            >
              Word
            </Button>
            <Button
              variant={highlightStyle === "line" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setHighlightStyle("line")}
            >
              Line
            </Button>
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div className="max-h-[600px] overflow-auto">
        <AnimatePresence mode="wait">
          {splitView ? (
            <motion.div
              key="split"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-2"
            >
              {/* Original Side */}
              <div className="min-w-0 border-r border-border/50">
                <div className="sticky top-0 border-b border-border/30 bg-red-500/5 px-4 py-1.5">
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                    Original
                  </span>
                </div>
                <div className={paneScrollClassName}>
                  <div className="min-w-max">
                    {rows.map((row) => (
                      <DiffLineComponent
                        key={`orig-${row.id}`}
                        rowId={row.id}
                        line={row.original ?? PLACEHOLDER_LINE}
                        showLineNumbers={showLineNumbers}
                        isPlaceholder={!row.original}
                        isHovered={hoveredRowId === row.id}
                        onHover={setHoveredRowId}
                        highlightStyle={highlightStyle}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Updated Side */}
              <div className="min-w-0">
                <div className="sticky top-0 border-b border-border/30 bg-emerald-500/5 px-4 py-1.5">
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Updated
                  </span>
                </div>
                <div className={paneScrollClassName}>
                  <div className="min-w-max">
                    {rows.map((row) => (
                      <DiffLineComponent
                        key={`upd-${row.id}`}
                        rowId={row.id}
                        line={row.updated ?? PLACEHOLDER_LINE}
                        showLineNumbers={showLineNumbers}
                        isPlaceholder={!row.updated}
                        isHovered={hoveredRowId === row.id}
                        onHover={setHoveredRowId}
                        highlightStyle={highlightStyle}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="inline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="sticky top-0 border-b border-border/30 bg-muted/30 px-4 py-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Unified Diff
                </span>
              </div>
              <div className={paneScrollClassName}>
                <div className="min-w-max">
                  {inlineLines.map((entry) => (
                    <DiffLineComponent
                      key={entry.id}
                      rowId={entry.id}
                      line={entry.line}
                      showLineNumbers={showLineNumbers}
                      isHovered={false}
                      onHover={() => {}}
                      highlightStyle={highlightStyle}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
