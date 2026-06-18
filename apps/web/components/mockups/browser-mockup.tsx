"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FrameScreen } from "./frame-screen";
import { useMockupEmbedded } from "./mockup-embed-context";
import type { MockupScreenProps } from "./types";

export const BROWSER_MOCKUP_VARIANTS = [
  { variant: "chrome", label: "Chrome" },
  { variant: "safari", label: "Safari" },
  { variant: "firefox", label: "Firefox" },
  { variant: "arc", label: "Arc" },
] as const;

export type BrowserChromeVariant =
  (typeof BROWSER_MOCKUP_VARIANTS)[number]["variant"];

/** Default decorative URL for docs / showcase previews. */
export const BROWSER_MOCKUP_DEFAULT_PREVIEW_URL = "acme.app";

export type BrowserMockupTab = {
  id?: string;
  label: string;
  url?: string;
  liveUrl?: string;
  image?: string;
  imageAlt?: string;
  children?: ReactNode;
};

export type BrowserMockupTabsInput = string[] | BrowserMockupTab[];

const MAX_BROWSER_MOCKUP_TABS = 3;

export function normalizeBrowserMockupTab(
  tab: string | BrowserMockupTab,
): BrowserMockupTab {
  return typeof tab === "string" ? { label: tab } : tab;
}

export function normalizeBrowserMockupTabs(
  tabs: BrowserMockupTabsInput,
): BrowserMockupTab[] {
  return tabs.map(normalizeBrowserMockupTab).slice(0, MAX_BROWSER_MOCKUP_TABS);
}

/** Tab carries its own viewport (children, image, or URL embed). */
export function tabHasViewportContent(tab: BrowserMockupTab): boolean {
  if (tab.children != null) return true;
  if (tab.image != null) return true;
  if (tab.liveUrl != null && tab.liveUrl.trim() !== "") return true;
  if (tab.url != null && tab.url.trim() !== "") return true;
  return false;
}

/** Multi-tab mode: `tabs` prop includes at least one tab with viewport content. */
export function isInteractiveBrowserTabs(
  tabs: BrowserMockupTab[],
  hasExplicitTabs: boolean,
): boolean {
  return hasExplicitTabs && tabs.some(tabHasViewportContent);
}

export function getBrowserMockupTabKey(
  tab: BrowserMockupTab,
  index: number,
): string {
  return tab.id ?? String(index);
}

/** Resolve decorative tab labels (max 3). */
export function resolveBrowserMockupTabs(
  tabs: BrowserMockupTabsInput | undefined,
  primaryLabel: string,
): BrowserMockupTab[] {
  if (tabs?.length) {
    return normalizeBrowserMockupTabs(tabs);
  }
  return [{ label: primaryLabel }, { label: "New Tab" }];
}

function buildInitialTabUrls(
  tabs: BrowserMockupTab[],
  fallbackUrl: string,
): Record<string, string> {
  const urls: Record<string, string> = {};
  tabs.forEach((tab, index) => {
    urls[getBrowserMockupTabKey(tab, index)] = tab.url?.trim() || fallbackUrl;
  });
  return urls;
}

function findTabIndexById(tabs: BrowserMockupTab[], id: string): number {
  const index = tabs.findIndex((tab) => tab.id === id);
  return index >= 0 ? index : 0;
}

type TabStripProps = {
  tabs: BrowserMockupTab[];
  activeIndex: number;
  onSelect: (index: number) => void;
  embedded?: boolean;
};

type BrowserChromeProps = {
  variant?: BrowserChromeVariant;
  urlBar: ReactNode;
  embedded?: boolean;
  showTabs?: boolean;
  tabs: BrowserMockupTab[];
  activeTabIndex: number;
  onTabSelect: (index: number) => void;
};

function TrafficLights({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const dot = size === "sm" ? "size-2" : "size-2.5";
  return (
    <div className={cn("flex shrink-0 gap-1.5", className)} aria-hidden>
      <span className={cn(dot, "rounded-full bg-[#ff5f57] shadow-sm")} />
      <span className={cn(dot, "rounded-full bg-[#febc2e] shadow-sm")} />
      <span className={cn(dot, "rounded-full bg-[#28c840] shadow-sm")} />
    </div>
  );
}

function SafariNavDecor() {
  return (
    <div
      className="flex shrink-0 items-center gap-0.5 text-muted-foreground/70"
      aria-hidden
    >
      <span className="flex size-6 items-center justify-center rounded-md text-[10px]">
        ‹
      </span>
      <span className="flex size-6 items-center justify-center rounded-md text-[10px] opacity-40">
        ›
      </span>
    </div>
  );
}

function ChromeTabRow({
  tabs,
  activeIndex,
  onSelect,
  embedded,
}: TabStripProps) {
  const tabHeight = embedded ? "h-5" : "h-6";
  const textSize = embedded ? "text-[9px]" : "text-[10px]";

  return (
    <div
      className="flex min-w-0 flex-1 items-end gap-0.5 overflow-hidden"
      aria-hidden
    >
      {tabs.map((tab, index) => (
        <button
          key={`${tab.label}-${index}`}
          type="button"
          aria-selected={activeIndex === index}
          onClick={() => onSelect(index)}
          className={cn(
            "flex max-w-[120px] min-w-[72px] shrink-0 items-center gap-1.5 truncate rounded-t-md border border-b-0 px-2.5 font-medium",
            tabHeight,
            textSize,
            activeIndex === index
              ? "border-border/80 bg-background text-foreground shadow-sm dark:border-[#3c4043] dark:bg-[#292a2d]"
              : "border-transparent bg-[#dee1e6] text-muted-foreground hover:bg-[#d3d7dc] dark:bg-[#35363a] dark:text-[#9aa0a6] dark:hover:bg-[#3c4043]",
          )}
        >
          <span className="size-2 shrink-0 rounded-sm bg-muted-foreground/30" />
          <span className="truncate">{tab.label}</span>
        </button>
      ))}
      <span
        className={cn(
          "mb-0.5 flex shrink-0 items-center justify-center rounded-full text-muted-foreground/70",
          embedded ? "size-4 text-[10px]" : "size-5 text-xs",
        )}
        aria-hidden
      >
        +
      </span>
    </div>
  );
}

function SafariTabRow({
  tabs,
  activeIndex,
  onSelect,
  embedded,
}: TabStripProps) {
  const textSize = embedded ? "text-[9px]" : "text-[10px]";
  const pillPad = embedded ? "px-2 py-0.5" : "px-2.5 py-1";

  return (
    <div
      className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden"
      aria-hidden
    >
      {tabs.map((tab, index) => (
        <button
          key={`${tab.label}-${index}`}
          type="button"
          aria-selected={activeIndex === index}
          onClick={() => onSelect(index)}
          className={cn(
            "max-w-[100px] truncate rounded-full font-medium transition-colors",
            textSize,
            pillPad,
            activeIndex === index
              ? "bg-white text-foreground shadow-sm dark:bg-[#1e1e1e] dark:text-foreground"
              : "bg-black/5 text-muted-foreground hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function FirefoxTabStrip({
  tabs,
  activeIndex,
  onSelect,
  embedded,
}: TabStripProps) {
  const tabHeight = embedded ? "h-5" : "h-6";
  const textSize = embedded ? "text-[9px]" : "text-[10px]";

  return (
    <div
      className={cn(
        "flex shrink-0 items-end gap-0.5 bg-[#f0f0f4] px-2 pt-1 dark:bg-[#1c1b22]",
        embedded ? "h-6" : "h-7",
      )}
      aria-hidden
    >
      {tabs.map((tab, index) => (
        <button
          key={`${tab.label}-${index}`}
          type="button"
          aria-selected={activeIndex === index}
          onClick={() => onSelect(index)}
          className={cn(
            "flex max-w-[140px] min-w-[88px] items-center gap-1.5 truncate rounded-t-lg border border-b-0 px-2.5 font-medium",
            tabHeight,
            textSize,
            activeIndex === index
              ? "border-[#d7d7db] bg-background text-foreground shadow-sm dark:border-[#3a3942]"
              : "border-transparent bg-transparent text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5",
          )}
        >
          {activeIndex === index ? (
            <span className="size-2 shrink-0 rounded-full bg-[#ff7139]" />
          ) : (
            <span className="size-2 shrink-0 rounded-full bg-muted-foreground/25" />
          )}
          <span className="truncate">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

function ArcTabChips({ tabs, activeIndex, onSelect, embedded }: TabStripProps) {
  const textSize = embedded ? "text-[9px]" : "text-[10px]";
  const chipPad = embedded ? "px-2 py-0.5" : "px-2.5 py-1";

  return (
    <div className="flex shrink-0 items-center gap-1" aria-hidden>
      {tabs.slice(0, 2).map((tab, index) => (
        <button
          key={`${tab.label}-${index}`}
          type="button"
          aria-selected={activeIndex === index}
          onClick={() => onSelect(index)}
          className={cn(
            "max-w-[88px] truncate rounded-full font-medium text-white shadow-sm",
            textSize,
            chipPad,
            activeIndex === index
              ? "bg-linear-to-r from-[#6366f1] to-[#a855f7]"
              : "bg-linear-to-r from-[#6366f1]/50 to-[#a855f7]/50 opacity-80 hover:opacity-100",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ChromeChrome({
  urlBar,
  embedded,
  showTabs,
  tabs,
  activeTabIndex,
  onTabSelect,
}: BrowserChromeProps) {
  return (
    <div className="flex shrink-0 flex-col border-b border-border/80 bg-[#e8eaed] dark:bg-[#202124]">
      {showTabs ? (
        <div
          className={cn(
            "flex items-end gap-2 px-3 pt-1",
            embedded ? "pb-0" : "pb-0.5",
          )}
        >
          <TrafficLights />
          <ChromeTabRow
            tabs={tabs}
            activeIndex={activeTabIndex}
            onSelect={onTabSelect}
            embedded={embedded}
          />
        </div>
      ) : null}
      <div
        className={cn(
          "flex items-center gap-2 px-3",
          embedded ? "py-1.5" : "py-2",
          showTabs ? "pt-1" : "",
        )}
      >
        {!showTabs ? <TrafficLights /> : null}
        <div className="min-w-0 flex-1">{urlBar}</div>
      </div>
    </div>
  );
}

function SafariChrome({
  urlBar,
  embedded,
  showTabs,
  tabs,
  activeTabIndex,
  onTabSelect,
}: BrowserChromeProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-b border-[#d1d1d6]/80 bg-[#f5f5f7]",
        embedded ? "dark:bg-[#2b2b2b]" : "dark:bg-[#323232]",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-3",
          embedded ? "py-1.5" : "py-2",
        )}
      >
        <TrafficLights />
        <SafariNavDecor />
        {showTabs ? (
          <SafariTabRow
            tabs={tabs}
            activeIndex={activeTabIndex}
            onSelect={onTabSelect}
            embedded={embedded}
          />
        ) : (
          <div className="mx-auto min-w-0 w-full max-w-lg flex-1 [&>div]:rounded-full [&>div]:border-[#c7c7cc] [&>div]:bg-white [&>div]:shadow-sm dark:[&>div]:border-[#555] dark:[&>div]:bg-[#1e1e1e]">
            {urlBar}
          </div>
        )}
        <div className="w-[52px] shrink-0" aria-hidden />
      </div>
      {showTabs ? (
        <div className={cn("px-3 pb-2", embedded ? "pt-0" : "pt-0")}>
          <div className="mx-auto min-w-0 w-full max-w-lg [&>div]:rounded-full [&>div]:border-[#c7c7cc] [&>div]:bg-white [&>div]:shadow-sm dark:[&>div]:border-[#555] dark:[&>div]:bg-[#1e1e1e]">
            {urlBar}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FirefoxChrome({
  urlBar,
  embedded,
  showTabs,
  tabs,
  activeTabIndex,
  onTabSelect,
}: BrowserChromeProps) {
  return (
    <div className="flex shrink-0 flex-col">
      {showTabs ? (
        <FirefoxTabStrip
          tabs={tabs}
          activeIndex={activeTabIndex}
          onSelect={onTabSelect}
          embedded={embedded}
        />
      ) : null}
      <div
        className={cn(
          "flex items-center gap-2 border-b border-[#cfcfd8] bg-[#f9f9fb] px-2 dark:border-[#3a3942] dark:bg-[#2b2a33]",
          embedded ? "py-1" : "py-1.5",
        )}
      >
        <span
          className="size-5 shrink-0 rounded-full bg-[#ff7139]"
          aria-hidden
        />
        <div className="min-w-0 flex-1 [&>div]:rounded-lg [&>div]:border-[#cfcfd8] [&>div]:bg-white dark:[&>div]:border-[#52525e] dark:[&>div]:bg-[#42414d]">
          {urlBar}
        </div>
      </div>
    </div>
  );
}

function ArcChrome({
  urlBar,
  embedded,
  showTabs,
  tabs,
  activeTabIndex,
  onTabSelect,
}: BrowserChromeProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center gap-2 overflow-hidden border-b border-[#e8e4f0] bg-[#faf8ff] px-3 dark:border-[#3d3550] dark:bg-[#1a1625]",
        embedded ? "py-1.5" : "py-2",
      )}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-linear-to-b from-[#5b5bd6] via-[#a855f7] to-[#ec4899]"
        aria-hidden
      />
      <TrafficLights className="ml-1" size="sm" />
      {showTabs ? (
        <ArcTabChips
          tabs={tabs}
          activeIndex={activeTabIndex}
          onSelect={onTabSelect}
          embedded={embedded}
        />
      ) : null}
      <div className="min-w-0 flex-1 [&>div]:rounded-2xl [&>div]:border-[#e0d8f0] [&>div]:bg-white/90 [&>div]:shadow-sm dark:[&>div]:border-[#4a4060] dark:[&>div]:bg-[#252030]/90">
        {urlBar}
      </div>
      <div
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#6366f1] to-[#a855f7] text-[9px] font-bold text-white shadow-sm"
        aria-hidden
      >
        A
      </div>
    </div>
  );
}

export function BrowserChrome({
  variant = "chrome",
  urlBar,
  embedded,
  showTabs = true,
  tabs,
  activeTabIndex,
  onTabSelect,
}: BrowserChromeProps) {
  const chromeProps: BrowserChromeProps = {
    variant,
    urlBar,
    embedded,
    showTabs,
    tabs,
    activeTabIndex,
    onTabSelect,
  };

  switch (variant) {
    case "safari":
      return <SafariChrome {...chromeProps} />;
    case "firefox":
      return <FirefoxChrome {...chromeProps} />;
    case "arc":
      return <ArcChrome {...chromeProps} />;
    case "chrome":
    default:
      return <ChromeChrome {...chromeProps} />;
  }
}

export function browserMockupShellClass(
  variant: BrowserChromeVariant,
  embedded: boolean,
): string {
  if (embedded) return "";

  switch (variant) {
    case "safari":
      return "rounded-xl overflow-hidden shadow-lg ring-1 ring-black/5";
    case "firefox":
      return "rounded-lg overflow-hidden shadow-md ring-1 ring-border";
    case "arc":
      return "rounded-2xl overflow-hidden shadow-xl ring-1 ring-[#c4b5fd]/40";
    case "chrome":
    default:
      return "rounded-xl overflow-hidden shadow-lg ring-1 ring-border/60";
  }
}

const HOSTNAME_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

/** Host must look like a real web address (not userinfo@host or a bare label). */
function isPlausibleLiveHostname(hostname: string): boolean {
  if (!hostname) return false;

  const lower = hostname.toLowerCase();
  if (lower === "localhost") return true;

  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return hostname.split(".").every((part) => {
      const n = Number(part);
      return Number.isInteger(n) && n >= 0 && n <= 255;
    });
  }

  if (!/^[a-z0-9.-]+$/i.test(hostname)) return false;
  if (hostname.includes("..")) return false;
  if (hostname.startsWith(".") || hostname.endsWith(".")) return false;
  if (!hostname.includes(".")) return false;

  const labels = hostname.split(".");
  if (labels.some((label) => !label || !HOSTNAME_LABEL.test(label))) {
    return false;
  }

  const tld = labels[labels.length - 1] ?? "";
  return tld.length >= 2;
}

/** Normalize user input into a safe http(s) URL for iframe embedding. */
export function normalizeLiveUrl(input: string | undefined): string | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    if (parsed.username || parsed.password) {
      return null;
    }
    if (!isPlausibleLiveHostname(parsed.hostname)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function resolveBrowserLiveUrl(
  liveUrl?: string,
  chromeUrl?: string,
): string | null {
  const fromLive = normalizeLiveUrl(liveUrl);
  if (fromLive) return fromLive;

  const chrome = chromeUrl?.trim() ?? "";
  if (/^https?:\/\//i.test(chrome)) {
    return normalizeLiveUrl(chrome);
  }

  return null;
}

export function liveUrlChromeLabel(
  chromeUrl: string,
  resolvedLive: string | null,
): string {
  if (resolvedLive) {
    try {
      return new URL(resolvedLive).host;
    } catch {
      return chromeUrl;
    }
  }
  return chromeUrl;
}

/** Default iframe sandbox for live URL embeds - minimal permissions for demos. */
export const DEFAULT_BROWSER_IFRAME_SANDBOX = "allow-scripts allow-forms";

/** How long to wait for iframe `load` before showing an embed-blocked message. */
export const BROWSER_MOCKUP_EMBED_LOAD_TIMEOUT_MS = 5000;

type BrowserUrlBarProps = {
  value: string;
  onChange: (value: string) => void;
  /** Navigate - only called on Enter. */
  onCommit: () => void;
  /** Revert the bar when focus leaves without navigating (blur or Escape). */
  onDismiss: () => void;
  /** Highlight the bar when the committed value is not a valid URL. */
  invalid?: boolean;
  className?: string;
};

export function BrowserUrlBar({
  value,
  onChange,
  onCommit,
  onDismiss,
  invalid = false,
  className,
}: BrowserUrlBarProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const skipDismissOnBlurRef = useRef(false);
  const [focused, setFocused] = useState(false);

  const dismiss = () => {
    onDismiss();
    inputRef.current?.blur();
  };

  const commit = () => {
    skipDismissOnBlurRef.current = true;
    onCommit();
    inputRef.current?.blur();
  };

  return (
    <div
      className={cn(
        "min-w-0 flex-1 rounded-md border bg-background transition-colors",
        invalid
          ? "border-destructive ring-2 ring-destructive/25"
          : focused
          ? "border-ring ring-2 ring-ring/30"
          : "border-border/60 hover:border-border",
        className,
      )}
    >
      <label htmlFor={inputId} className="sr-only">
        Address
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => {
          setFocused(true);
          event.currentTarget.select();
        }}
        onBlur={() => {
          setFocused(false);
          if (skipDismissOnBlurRef.current) {
            skipDismissOnBlurRef.current = false;
            return;
          }
          onDismiss();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            dismiss();
          }
        }}
        className={cn(
          "w-full min-w-0 bg-transparent px-3 py-1 text-left text-xs outline-none",
          focused ? "text-foreground" : "text-muted-foreground",
        )}
        aria-label="Address"
      />
    </div>
  );
}

type BrowserLiveFrameProps = {
  src: string;
  title: string;
  className?: string;
  showEmbedHint?: boolean;
  sandbox?: string;
  /** Remount the iframe when `src` changes. When false, only update `src` in place. Default true. */
  reloadOnUrlChange?: boolean;
  /** Ms to wait for iframe `load` before showing embed-blocked UI. @default 5000 */
  embedLoadTimeoutMs?: number;
};

export function BrowserLiveFrame({
  src,
  title,
  className,
  showEmbedHint = true,
  sandbox = DEFAULT_BROWSER_IFRAME_SANDBOX,
  reloadOnUrlChange = true,
  embedLoadTimeoutMs = BROWSER_MOCKUP_EMBED_LOAD_TIMEOUT_MS,
}: BrowserLiveFrameProps) {
  const [loading, setLoading] = useState(true);
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const hasLoadedRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    hasLoadedRef.current = false;
    setLoading(true);
    setEmbedBlocked(false);

    const timeoutId = window.setTimeout(() => {
      if (!hasLoadedRef.current) {
        setEmbedBlocked(true);
        setLoading(false);
      }
    }, embedLoadTimeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [src, embedLoadTimeoutMs]);

  const handleIframeLoad = () => {
    hasLoadedRef.current = true;
    setLoading(false);

    const iframe = iframeRef.current;
    if (iframe) {
      try {
        const href = iframe.contentWindow?.location.href ?? "";
        if (href === "about:blank" || href === "about:srcdoc") {
          setEmbedBlocked(true);
          return;
        }
      } catch {
        // Cross-origin load - assume the embed succeeded.
      }
    }

    setEmbedBlocked(false);
  };

  return (
    <div
      className={cn(
        "relative flex size-full min-h-0 flex-col overflow-hidden bg-background",
        className,
      )}
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        {loading ? (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/90 backdrop-blur-[2px]"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Loading…</span>
          </div>
        ) : null}
        {embedBlocked ? (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-background px-6 text-center"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-medium text-foreground">
              This site may block embedding.
            </p>
            <p className="text-xs text-muted-foreground">Try another URL.</p>
          </div>
        ) : null}
        <iframe
          ref={iframeRef}
          key={reloadOnUrlChange ? src : "browser-mockup-live-frame"}
          src={src}
          title={`Live preview: ${title}`}
          className={cn(
            "min-h-0 w-full flex-1 border-0 bg-background",
            embedBlocked && "opacity-0 pointer-events-none",
          )}
          sandbox={sandbox}
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={handleIframeLoad}
        />
      </div>
      {showEmbedHint ? (
        <p className="shrink-0 border-t border-border/60 bg-muted/30 px-3 py-1.5 text-center text-[10px] leading-snug text-muted-foreground">
          Live embed - many sites (e.g. Google) block iframes. Use your app or
          embed-friendly pages like example.com.
        </p>
      ) : null}
    </div>
  );
}

export type BrowserMockupProps = MockupScreenProps & {
  /** Committed URL in the chrome bar (also used as iframe src when http(s)). */
  url?: string;
  /**
   * Load a remote page in the viewport via iframe. Ignored when `children` are set.
   * Many third-party sites block embedding; prefer your own app or embed-friendly URLs.
   */
  liveUrl?: string;
  /** Called when the user commits a new address from the chrome bar (Enter). */
  onNavigate?: (url: string, liveSrc: string | null) => void;
  /** Show a short note when rendering a live iframe. Default true. */
  showLiveEmbedHint?: boolean;
  /**
   * iframe `sandbox` tokens for live URL mode.
   * @default {@link DEFAULT_BROWSER_IFRAME_SANDBOX} (`allow-scripts allow-forms`)
   */
  sandbox?: string;
  /**
   * Remount the live iframe when the committed URL changes.
   * When false, update `src` in place (preserves history/state where embeds allow).
   * @default true
   */
  reloadOnUrlChange?: boolean;
  /**
   * Fill the parent device screen (drops max-width and fixed aspect ratio).
   * Defaults to true when nested inside a device mockup such as LaptopMockup.
   */
  fill?: boolean;
  /** Browser chrome styling for landing-page mockups. @default "chrome" */
  variant?: BrowserChromeVariant;
  /**
   * Tab chrome labels, or per-tab viewport when a tab includes
   * `children`, `image`, `url`, or `liveUrl` (interactive mode).
   */
  tabs?: BrowserMockupTabsInput;
  /** Show variant-specific tab UI. @default true */
  showTabs?: boolean;
  /** Initial active tab index (uncontrolled). @default 0 */
  defaultActiveTab?: number;
  /** Initial active tab id (uncontrolled). Takes precedence over defaultActiveTab when matched. */
  defaultActiveTabId?: string;
  /** Controlled active tab index. */
  activeTabIndex?: number;
  /** Controlled active tab id. */
  activeTabId?: string;
  /** Fired when the user selects a tab. */
  onTabChange?: (tab: BrowserMockupTab, index: number) => void;
};

type BrowserMockupScreenProps = {
  tab?: BrowserMockupTab;
  committedUrl: string;
  liveUrlProp?: string;
  children?: ReactNode;
  image?: string;
  imageAlt?: string;
  viewportClassName?: string;
  screenScrollable?: boolean;
  embedded: boolean;
  showLiveEmbedHint: boolean;
  sandbox?: string;
  reloadOnUrlChange: boolean;
};

function BrowserMockupScreen({
  tab,
  committedUrl,
  liveUrlProp,
  children,
  image,
  imageAlt,
  viewportClassName,
  screenScrollable,
  embedded,
  showLiveEmbedHint,
  sandbox,
  reloadOnUrlChange,
}: BrowserMockupScreenProps) {
  const screenChildren = tab?.children ?? children;
  const screenImage = tab?.image ?? image;
  const screenImageAlt = tab?.imageAlt ?? imageAlt;
  const effectiveLiveUrl = tab?.liveUrl ?? liveUrlProp;

  const resolvedLiveUrl = screenChildren
    ? null
    : resolveBrowserLiveUrl(effectiveLiveUrl, committedUrl);

  const chromeLabel = liveUrlChromeLabel(committedUrl, resolvedLiveUrl);

  if (resolvedLiveUrl) {
    return (
      <BrowserLiveFrame
        src={resolvedLiveUrl}
        title={chromeLabel}
        showEmbedHint={showLiveEmbedHint}
        sandbox={sandbox}
        reloadOnUrlChange={reloadOnUrlChange}
        className={viewportClassName}
      />
    );
  }

  return (
    <FrameScreen
      image={screenImage}
      imageAlt={screenImageAlt}
      viewportClassName={viewportClassName}
      screenScrollable={screenScrollable ?? screenChildren != null}
      className={embedded ? "min-h-0 flex-1" : undefined}
    >
      {screenChildren}
    </FrameScreen>
  );
}

export function BrowserMockup({
  children,
  image,
  imageAlt,
  className,
  viewportClassName,
  screenScrollable,
  url: urlProp = "app.example.com",
  liveUrl: liveUrlProp,
  onNavigate,
  showLiveEmbedHint = true,
  sandbox,
  reloadOnUrlChange = true,
  fill,
  variant = "chrome",
  tabs: tabsProp,
  showTabs = true,
  defaultActiveTab = 0,
  defaultActiveTabId,
  activeTabIndex: activeTabIndexProp,
  activeTabId: activeTabIdProp,
  onTabChange,
}: BrowserMockupProps) {
  const embedded = fill ?? useMockupEmbedded();
  const controlledNavigate = onNavigate !== undefined;
  const controlledTabSelection =
    activeTabIndexProp !== undefined || activeTabIdProp !== undefined;

  const hasExplicitTabs = tabsProp != null && tabsProp.length > 0;
  const normalizedExplicitTabs = useMemo(
    () => (hasExplicitTabs ? normalizeBrowserMockupTabs(tabsProp) : []),
    [hasExplicitTabs, tabsProp],
  );
  const interactive = isInteractiveBrowserTabs(
    normalizedExplicitTabs,
    hasExplicitTabs,
  );

  const [inputValue, setInputValue] = useState(urlProp);
  const [currentUrl, setCurrentUrl] = useState(urlProp);
  const [urlInvalid, setUrlInvalid] = useState(false);
  const [internalTabIndex, setInternalTabIndex] = useState(() => {
    if (defaultActiveTabId && hasExplicitTabs) {
      return findTabIndexById(normalizedExplicitTabs, defaultActiveTabId);
    }
    return defaultActiveTab;
  });
  const [tabUrls, setTabUrls] = useState<Record<string, string>>(() =>
    interactive ? buildInitialTabUrls(normalizedExplicitTabs, urlProp) : {},
  );

  const rawActiveTabIndex = controlledTabSelection
    ? activeTabIdProp != null
      ? findTabIndexById(normalizedExplicitTabs, activeTabIdProp)
      : activeTabIndexProp ?? 0
    : internalTabIndex;

  const activeTabIndex =
    interactive && normalizedExplicitTabs.length > 0
      ? Math.min(
          Math.max(rawActiveTabIndex, 0),
          normalizedExplicitTabs.length - 1,
        )
      : rawActiveTabIndex;

  const activeTab = interactive
    ? normalizedExplicitTabs[activeTabIndex]
    : undefined;
  const activeTabKey =
    activeTab != null
      ? getBrowserMockupTabKey(activeTab, activeTabIndex)
      : null;

  const activeUrl = interactive
    ? tabUrls[activeTabKey!] ?? activeTab?.url ?? urlProp
    : controlledNavigate
    ? urlProp
    : currentUrl;

  useEffect(() => {
    if (interactive) return;
    setInputValue(urlProp);
    setUrlInvalid(false);
    setInternalTabIndex(0);
    if (!controlledNavigate) {
      setCurrentUrl(urlProp);
    }
  }, [controlledNavigate, interactive, urlProp]);

  useEffect(() => {
    if (!interactive) return;
    setTabUrls(buildInitialTabUrls(normalizedExplicitTabs, urlProp));
  }, [interactive, normalizedExplicitTabs, urlProp]);

  useEffect(() => {
    if (!interactive || !activeTabKey) return;
    setInputValue(tabUrls[activeTabKey] ?? activeTab?.url ?? urlProp);
    setUrlInvalid(false);
  }, [activeTabKey, activeTab?.url, interactive, tabUrls, urlProp]);

  const handleTabSelect = useCallback(
    (index: number) => {
      if (!controlledTabSelection) {
        setInternalTabIndex(index);
      }
      const tab = interactive
        ? normalizedExplicitTabs[index]
        : resolveBrowserMockupTabs(
            tabsProp,
            liveUrlChromeLabel(
              activeUrl,
              resolveBrowserLiveUrl(liveUrlProp, activeUrl),
            ),
          )[index];
      if (tab) {
        onTabChange?.(tab, index);
      }
      if (interactive) {
        const selected = normalizedExplicitTabs[index];
        if (selected) {
          const key = getBrowserMockupTabKey(selected, index);
          setInputValue(tabUrls[key] ?? selected.url ?? urlProp);
          setUrlInvalid(false);
        }
      }
    },
    [
      activeUrl,
      controlledTabSelection,
      interactive,
      normalizedExplicitTabs,
      onTabChange,
      tabUrls,
      tabsProp,
      urlProp,
    ],
  );

  const commitNavigation = useCallback(() => {
    const trimmed = inputValue.trim();

    if (trimmed.length > 0 && normalizeLiveUrl(trimmed) === null) {
      setUrlInvalid(true);
      return;
    }

    setUrlInvalid(false);
    const nextUrl =
      trimmed || (interactive ? activeTab?.url : undefined) || urlProp;
    const nextLive = normalizeLiveUrl(nextUrl);

    if (interactive && activeTabKey) {
      setTabUrls((prev) => ({ ...prev, [activeTabKey]: nextUrl }));
      setInputValue(nextUrl);
      return;
    }

    if (controlledNavigate) {
      onNavigate(nextUrl, nextLive);
      return;
    }

    setCurrentUrl(nextUrl);
    setInputValue(nextUrl);
  }, [
    activeTab?.url,
    activeTabKey,
    controlledNavigate,
    inputValue,
    interactive,
    onNavigate,
    urlProp,
  ]);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      if (urlInvalid) {
        setUrlInvalid(false);
      }
    },
    [urlInvalid],
  );

  const chromeLabel = liveUrlChromeLabel(
    activeUrl,
    interactive && activeTab?.children
      ? null
      : resolveBrowserLiveUrl(
          controlledNavigate ? liveUrlProp : activeTab?.liveUrl,
          activeUrl,
        ),
  );

  const chromeTabs = interactive
    ? normalizedExplicitTabs
    : resolveBrowserMockupTabs(tabsProp, chromeLabel);

  const dismissUrl = useCallback(() => {
    setInputValue(activeUrl);
    setUrlInvalid(false);
  }, [activeUrl]);

  const urlBar = (
    <BrowserUrlBar
      value={inputValue}
      invalid={urlInvalid}
      onChange={handleInputChange}
      onCommit={commitNavigation}
      onDismiss={dismissUrl}
    />
  );

  return (
    <div
      className={cn(
        embedded
          ? "flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-transparent shadow-none"
          : cn(
              "mx-auto w-full max-w-3xl border border-border bg-background",
              browserMockupShellClass(variant, embedded),
            ),
        className,
      )}
    >
      <BrowserChrome
        variant={variant}
        urlBar={urlBar}
        embedded={embedded}
        showTabs={showTabs}
        tabs={chromeTabs}
        activeTabIndex={activeTabIndex}
        onTabSelect={handleTabSelect}
      />
      <div
        className={cn(
          "relative w-full bg-background",
          embedded ? "flex min-h-0 flex-1 flex-col" : "aspect-video",
        )}
      >
        <BrowserMockupScreen
          tab={interactive ? activeTab : undefined}
          committedUrl={activeUrl}
          liveUrlProp={interactive ? undefined : liveUrlProp}
          children={interactive ? undefined : children}
          image={interactive ? undefined : image}
          imageAlt={interactive ? undefined : imageAlt}
          viewportClassName={viewportClassName}
          screenScrollable={screenScrollable}
          embedded={embedded}
          showLiveEmbedHint={showLiveEmbedHint}
          sandbox={sandbox}
          reloadOnUrlChange={reloadOnUrlChange}
        />
      </div>
    </div>
  );
}
