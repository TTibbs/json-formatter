"use client";

import { useState, useCallback, useMemo } from "react";
import { Highlight, type PrismTheme } from "prism-react-renderer";
import { Check, ChevronDown, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";

/** Prism theme driven by registry `cssVars` - no runtime theme provider. */
const codeBlockPrismTheme: PrismTheme = {
  plain: {
    color: "var(--code-block-foreground)",
    backgroundColor: "transparent",
  },
  styles: [
    {
      types: ["changed"],
      style: { color: "var(--code-block-changed)" },
    },
    {
      types: ["deleted"],
      style: { color: "var(--code-block-deleted)" },
    },
    {
      types: ["inserted", "attr-name"],
      style: { color: "var(--code-block-inserted)" },
    },
    {
      types: ["comment"],
      style: { color: "var(--code-block-comment)" },
    },
    {
      types: ["string", "builtin", "char", "constant", "url"],
      style: { color: "var(--code-block-string)" },
    },
    {
      types: ["variable"],
      style: { color: "var(--code-block-variable)" },
    },
    {
      types: ["number"],
      style: { color: "var(--code-block-number)" },
    },
    {
      types: ["punctuation"],
      style: { color: "var(--code-block-punctuation)" },
    },
    {
      types: ["function", "selector", "doctype"],
      style: { color: "var(--code-block-function)" },
    },
    {
      types: ["class-name"],
      style: { color: "var(--code-block-class)" },
    },
    {
      types: ["tag"],
      style: { color: "var(--code-block-tag)" },
    },
    {
      types: ["operator", "property", "keyword", "namespace"],
      style: { color: "var(--code-block-keyword)" },
    },
    {
      types: ["boolean"],
      style: { color: "var(--code-block-boolean)" },
    },
  ],
};

export type CodeBlockLineHighlight =
  | "added"
  | "removed"
  | "modified"
  | "selected";

const lineHighlightClasses: Record<CodeBlockLineHighlight, string> = {
  added: "bg-green-500/10",
  removed: "bg-red-500/10",
  modified: "bg-yellow-500/10",
  selected: "bg-accent",
};

interface CodeBlockProps {
  code: string;
  language?: string;
  /**
   * Shown in the header instead of `language` when set (e.g. `"text"` for unlabeled markdown fences).
   * Prism still uses `language` for highlighting.
   */
  languageLabel?: string;
  filename?: string;
  showLineNumbers?: boolean;
  highlightedLines?: Record<number, CodeBlockLineHighlight>;
  showHeader?: boolean;
  /**
   * When true, the body starts in a short preview (clipped + fade); expand for full scrollable source.
   */
  collapsible?: boolean;
  /** Bump when the Code tab is opened again so the block returns to collapsed. */
  collapseResetKey?: number;
  showCopyButton?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language = "typescript",
  languageLabel,
  filename,
  showLineNumbers = true,
  highlightedLines,
  showHeader = true,
  collapsible = false,
  collapseResetKey = 0,
  showCopyButton = true,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(!collapsible);

  const headerLanguage = languageLabel ?? language;

  const lineCount = useMemo(
    () => code.trim().split(/\r?\n/).length || 0,
    [code],
  );

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const isEmbedded = !showHeader && !collapsible;

  const highlightBody = (
    <Highlight
      theme={codeBlockPrismTheme}
      code={code.trim()}
      language={language}
    >
      {({
        className: prismClassName,
        style,
        tokens,
        getLineProps,
        getTokenProps,
      }) => (
        <pre
          className={cn(prismClassName, "min-w-max p-4")}
          style={{ ...style, backgroundColor: "transparent", margin: 0 }}
        >
          {tokens.map((line, i) => {
            const lineProps = getLineProps({ line, key: i });
            const { key: _lineKey, ...lineRest } = lineProps;
            const lineHighlight = highlightedLines?.[i + 1];
            return (
              <div
                key={i}
                {...lineRest}
                className={cn(
                  lineRest.className,
                  "table-row",
                  lineHighlight && lineHighlightClasses[lineHighlight],
                )}
              >
                {showLineNumbers && (
                  <span className="table-cell w-8 select-none pr-4 text-right text-muted-foreground/50">
                    {i + 1}
                  </span>
                )}
                <span className="table-cell">
                  {line.map((token, tokenIndex) => {
                    const tokenProps = getTokenProps({
                      token,
                      key: tokenIndex,
                    });
                    const { key: _tokenKey, ...tokenRest } = tokenProps;
                    return <span key={tokenIndex} {...tokenRest} />;
                  })}
                </span>
              </div>
            );
          })}
        </pre>
      )}
    </Highlight>
  );

  const copyButton = (
    <button
      type="button"
      onClick={handleCopy}
      className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
      aria-label={copied ? "Copied" : "Copy code"}
    >
      {copied ? (
        <>
          <Check className="size-4 text-terminal-green" />
          <span className="text-xs text-terminal-green">Copied</span>
        </>
      ) : (
        <>
          <Copy className="size-4" />
          <span className="text-xs">Copy</span>
        </>
      )}
    </button>
  );

  const scrollableBody = (
    <div
      className={cn(
        isEmbedded ? "min-h-0 flex-1 overflow-auto" : "overflow-auto",
      )}
    >
      {highlightBody}
    </div>
  );

  const shellClassName = cn(
    "font-mono text-sm text-[var(--code-block-foreground)]",
    isEmbedded
      ? "flex h-full min-h-0 flex-col overflow-hidden"
      : "overflow-hidden rounded-lg border border-border bg-[var(--code-block-background)]",
    className,
  );

  const headerBarClassName =
    "flex items-center justify-between gap-2 border-b border-border/60 bg-[var(--code-block-background)] px-4 py-2";

  return (
    <div
      key={collapsible ? `code-block-${collapseResetKey}` : undefined}
      className={shellClassName}
    >
      {collapsible ? (
        <Collapsible open={sourceOpen} onOpenChange={setSourceOpen}>
          <div className={headerBarClassName}>
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex max-w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm font-medium text-foreground hover:bg-secondary/80"
                >
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      sourceOpen && "rotate-180",
                    )}
                  />
                  <span className="truncate">
                    {sourceOpen ? "Show less" : "Show all"}
                  </span>
                  <span className="shrink-0 text-xs font-normal text-muted-foreground">
                    ({lineCount} lines)
                  </span>
                </button>
              </CollapsibleTrigger>
              {filename ? (
                <span className="hidden truncate font-medium text-foreground/90 sm:inline">
                  {filename}
                </span>
              ) : headerLanguage ? (
                <span className="hidden text-xs uppercase tracking-wider text-muted-foreground sm:inline">
                  {headerLanguage}
                </span>
              ) : null}
            </div>
            {showCopyButton && copyButton}
          </div>
          <div
            className={cn(
              "relative transition-[max-height] duration-200 ease-out",
              sourceOpen
                ? "max-h-[min(85vh,56rem)] overflow-y-auto overflow-x-auto"
                : "max-h-52 overflow-hidden",
            )}
          >
            {highlightBody}
            {!sourceOpen && lineCount > 1 ? (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-t from-(--code-block-background) from-40% via-(--code-block-background)/70 to-transparent"
                aria-hidden
              />
            ) : null}
          </div>
        </Collapsible>
      ) : showHeader ? (
        <>
          <div className={cn(headerBarClassName, "gap-0")}>
            <div className="flex items-center gap-3">
              {filename && (
                <span className="font-medium text-foreground/90">
                  {filename}
                </span>
              )}
              {!filename && headerLanguage && (
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {headerLanguage}
                </span>
              )}
            </div>
            {showCopyButton && copyButton}
          </div>
          {scrollableBody}
        </>
      ) : (
        scrollableBody
      )}
    </div>
  );
}
