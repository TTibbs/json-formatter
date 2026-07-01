"use client";

import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type OverlayPlacement = "auto" | "top" | "right" | "bottom" | "left";
type OverlayTarget = string | RefObject<HTMLElement | null>;

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type CardSize = {
  width: number;
  height: number;
};

type ViewportSize = {
  width: number;
  height: number;
};

export type FocusModeOverlayProps = {
  target: OverlayTarget;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  placement?: OverlayPlacement;
  padding?: number;
  radius?: number;
  backdropOpacity?: number;
  zIndex?: number;
  scrollIntoView?: boolean;
  lockScroll?: boolean;
  allowBackgroundInteraction?: boolean;
  showPulse?: boolean;
  respectReducedMotion?: boolean;
  className?: string;
  spotlightClassName?: string;
  cardClassName?: string;
  closeButtonClassName?: string;
};

const CARD_MAX_WIDTH = 340;
const CARD_FALLBACK_HEIGHT = 190;
const CARD_GAP = 16;
const VIEWPORT_PADDING = 16;
const SPOTLIGHT_COLOR = "rgb(34 211 238)";

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;

  return Math.min(Math.max(value, min), max);
}

function roundRect(rect: SpotlightRect): SpotlightRect {
  return {
    top: Math.round(rect.top),
    left: Math.round(rect.left),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function rectsAreEqual(a: SpotlightRect | null, b: SpotlightRect) {
  if (!a) return false;

  return (
    Math.round(a.top) === Math.round(b.top) &&
    Math.round(a.left) === Math.round(b.left) &&
    Math.round(a.width) === Math.round(b.width) &&
    Math.round(a.height) === Math.round(b.height)
  );
}

function viewportSizesAreEqual(a: ViewportSize, b: ViewportSize) {
  return a.width === b.width && a.height === b.height;
}

function resolvePlacement({
  rect,
  preferredPlacement,
  cardSize,
  viewportSize,
}: {
  rect: SpotlightRect;
  preferredPlacement: OverlayPlacement;
  cardSize: CardSize;
  viewportSize: ViewportSize;
}) {
  if (preferredPlacement !== "auto") return preferredPlacement;

  const spaceAbove = rect.top;
  const spaceBelow = viewportSize.height - (rect.top + rect.height);
  const spaceLeft = rect.left;
  const spaceRight = viewportSize.width - (rect.left + rect.width);

  if (spaceBelow >= cardSize.height + CARD_GAP) return "bottom";
  if (spaceAbove >= cardSize.height + CARD_GAP) return "top";
  if (spaceRight >= cardSize.width + CARD_GAP) return "right";
  if (spaceLeft >= cardSize.width + CARD_GAP) return "left";

  return "bottom";
}

function getCardStyle({
  rect,
  preferredPlacement,
  cardSize,
  viewportSize,
}: {
  rect: SpotlightRect;
  preferredPlacement: OverlayPlacement;
  cardSize: CardSize;
  viewportSize: ViewportSize;
}): CSSProperties {
  const safeWidth = Math.min(
    CARD_MAX_WIDTH,
    Math.max(260, viewportSize.width - VIEWPORT_PADDING * 2),
  );

  const measuredCardSize = {
    width: safeWidth,
    height: cardSize.height,
  };

  const placement = resolvePlacement({
    rect,
    preferredPlacement,
    cardSize: measuredCardSize,
    viewportSize,
  });

  const maxLeft = viewportSize.width - safeWidth - VIEWPORT_PADDING;
  const maxTop = viewportSize.height - cardSize.height - VIEWPORT_PADDING;

  if (placement === "top") {
    return {
      width: safeWidth,
      left: clamp(
        rect.left + rect.width / 2 - safeWidth / 2,
        VIEWPORT_PADDING,
        maxLeft,
      ),
      top: clamp(
        rect.top - cardSize.height - CARD_GAP,
        VIEWPORT_PADDING,
        maxTop,
      ),
    };
  }

  if (placement === "right") {
    return {
      width: safeWidth,
      left: clamp(rect.left + rect.width + CARD_GAP, VIEWPORT_PADDING, maxLeft),
      top: clamp(
        rect.top + rect.height / 2 - cardSize.height / 2,
        VIEWPORT_PADDING,
        maxTop,
      ),
    };
  }

  if (placement === "left") {
    return {
      width: safeWidth,
      left: clamp(rect.left - safeWidth - CARD_GAP, VIEWPORT_PADDING, maxLeft),
      top: clamp(
        rect.top + rect.height / 2 - cardSize.height / 2,
        VIEWPORT_PADDING,
        maxTop,
      ),
    };
  }

  return {
    width: safeWidth,
    left: clamp(
      rect.left + rect.width / 2 - safeWidth / 2,
      VIEWPORT_PADDING,
      maxLeft,
    ),
    top: clamp(rect.top + rect.height + CARD_GAP, VIEWPORT_PADDING, maxTop),
  };
}

function getElementFromTarget(target: OverlayTarget) {
  if (typeof target === "string") {
    return document.querySelector<HTMLElement>(target);
  }

  return target.current;
}

export function FocusModeOverlay({
  target,
  open,
  defaultOpen = true,
  onOpenChange,
  title,
  description,
  children,
  placement = "auto",
  padding = 10,
  radius = 24,
  backdropOpacity = 0.72,
  zIndex = 9999,
  scrollIntoView = true,
  lockScroll = false,
  allowBackgroundInteraction = false,
  showPulse = true,
  respectReducedMotion = true,
  className,
  spotlightClassName,
  cardClassName,
  closeButtonClassName,
}: FocusModeOverlayProps) {
  const titleId = useId();
  const descriptionId = useId();

  const cardRef = useRef<HTMLDivElement | null>(null);
  const rectFrameRef = useRef<number | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);

  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [cardSize, setCardSize] = useState<CardSize>({
    width: CARD_MAX_WIDTH,
    height: CARD_FALLBACK_HEIGHT,
  });
  const [viewportSize, setViewportSize] = useState<ViewportSize>({
    width: 0,
    height: 0,
  });

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const hasCardContent = Boolean(title || description || children);
  const shouldReduceMotion = respectReducedMotion && reducedMotion;

  const setIsOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const getTargetElement = useCallback(() => {
    return getElementFromTarget(target);
  }, [target]);

  const updateRect = useCallback(() => {
    if (typeof window === "undefined") return;

    const nextViewportSize = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    setViewportSize((current) => {
      if (viewportSizesAreEqual(current, nextViewportSize)) return current;

      return nextViewportSize;
    });

    const element = getTargetElement();

    if (!element) {
      setRect((current) => (current === null ? current : null));
      return;
    }

    const nextRect = element.getBoundingClientRect();

    const nextSpotlightRect = roundRect({
      top: nextRect.top - padding,
      left: nextRect.left - padding,
      width: nextRect.width + padding * 2,
      height: nextRect.height + padding * 2,
    });

    setRect((current) => {
      if (rectsAreEqual(current, nextSpotlightRect)) return current;

      return nextSpotlightRect;
    });
  }, [getTargetElement, padding]);

  const requestRectUpdate = useCallback(() => {
    if (rectFrameRef.current !== null) return;

    rectFrameRef.current = window.requestAnimationFrame(() => {
      rectFrameRef.current = null;
      updateRect();
    });
  }, [updateRect]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateReducedMotion = () => {
      setReducedMotion(mediaQuery.matches);
    };

    updateReducedMotion();

    mediaQuery.addEventListener("change", updateReducedMotion);

    return () => {
      mediaQuery.removeEventListener("change", updateReducedMotion);
    };
  }, []);

  useEffect(() => {
    if (!mounted || !isOpen) return;

    const element = getTargetElement();

    if (element && scrollIntoView) {
      element.scrollIntoView({
        block: "center",
        inline: "center",
        behavior: shouldReduceMotion ? "auto" : "smooth",
      });
    }

    updateRect();

    const timeout = window.setTimeout(
      updateRect,
      scrollIntoView && !shouldReduceMotion ? 450 : 0,
    );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    getTargetElement,
    isOpen,
    mounted,
    scrollIntoView,
    shouldReduceMotion,
    updateRect,
  ]);

  useEffect(() => {
    if (!mounted || !isOpen) return;

    let resizeObserver: ResizeObserver | null = null;

    const observeTarget = () => {
      resizeObserver?.disconnect();

      const element = getTargetElement();

      if (element) {
        resizeObserver = new ResizeObserver(requestRectUpdate);
        resizeObserver.observe(element);
      }

      requestRectUpdate();
    };

    const mutationObserver = new MutationObserver(observeTarget);

    observeTarget();

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("scroll", requestRectUpdate, true);
    window.addEventListener("resize", requestRectUpdate);

    return () => {
      resizeObserver?.disconnect();
      mutationObserver.disconnect();

      window.removeEventListener("scroll", requestRectUpdate, true);
      window.removeEventListener("resize", requestRectUpdate);

      if (rectFrameRef.current !== null) {
        window.cancelAnimationFrame(rectFrameRef.current);
        rectFrameRef.current = null;
      }
    };
  }, [getTargetElement, isOpen, mounted, requestRectUpdate]);

  useEffect(() => {
    if (!isOpen || !lockScroll) return;

    const previousOverflow = document.body.style.overflow;
    let didApplyLock = false;

    const timeout = window.setTimeout(
      () => {
        document.body.style.overflow = "hidden";
        didApplyLock = true;
      },
      scrollIntoView && !shouldReduceMotion ? 450 : 0,
    );

    return () => {
      window.clearTimeout(timeout);

      if (didApplyLock) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [isOpen, lockScroll, scrollIntoView, shouldReduceMotion]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (!isOpen || !hasCardContent) return;

    previousFocusedElementRef.current = document.activeElement as HTMLElement;

    const timeout = window.setTimeout(() => {
      cardRef.current?.focus({
        preventScroll: true,
      });
    }, 0);

    return () => {
      window.clearTimeout(timeout);

      previousFocusedElementRef.current?.focus?.({
        preventScroll: true,
      });

      previousFocusedElementRef.current = null;
    };
  }, [hasCardContent, isOpen]);

  useEffect(() => {
    const card = cardRef.current;

    if (!card || !hasCardContent) return;

    const updateCardSize = () => {
      const nextRect = card.getBoundingClientRect();

      setCardSize((current) => {
        const nextSize = {
          width: Math.round(nextRect.width),
          height: Math.round(nextRect.height),
        };

        if (
          current.width === nextSize.width &&
          current.height === nextSize.height
        ) {
          return current;
        }

        return nextSize;
      });
    };

    updateCardSize();

    const resizeObserver = new ResizeObserver(updateCardSize);
    resizeObserver.observe(card);

    return () => {
      resizeObserver.disconnect();
    };
  }, [hasCardContent, rect, title, description, children]);

  const cardStyle = useMemo(() => {
    if (!rect || !viewportSize.width || !viewportSize.height) {
      return undefined;
    }

    return getCardStyle({
      rect,
      preferredPlacement: placement,
      cardSize,
      viewportSize,
    });
  }, [cardSize, placement, rect, viewportSize]);

  if (!mounted || !isOpen || !rect) return null;

  return (
    <>
      <style>
        {`
          @keyframes tt-focus-mode-pulse {
            0%, 100% {
              opacity: 0.7;
              transform: scale(1);
            }

            50% {
              opacity: 0.28;
              transform: scale(1.035);
            }
          }
        `}
      </style>

      <div
        aria-hidden="true"
        onClick={() => setIsOpen(false)}
        className={cn(
          "fixed inset-0",
          allowBackgroundInteraction
            ? "pointer-events-none"
            : "pointer-events-auto",
          className,
        )}
        style={{ zIndex }}
      >
        <div
          className={cn(
            "pointer-events-none fixed border",
            !shouldReduceMotion &&
              "transition-[top,left,width,height] duration-200 ease-out",
            spotlightClassName,
          )}
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: radius,
            borderColor: SPOTLIGHT_COLOR,
            boxShadow: `0 0 0 9999px rgba(0, 0, 0, ${backdropOpacity}), 0 0 34px ${SPOTLIGHT_COLOR}`,
          }}
        />

        {showPulse && !shouldReduceMotion && (
          <div
            className="pointer-events-none fixed border"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              borderRadius: radius,
              borderColor: SPOTLIGHT_COLOR,
              boxShadow: `0 0 30px ${SPOTLIGHT_COLOR}`,
              animation: "tt-focus-mode-pulse 1.8s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {hasCardContent && cardStyle && (
        <div
          ref={cardRef}
          role="dialog"
          aria-modal={!allowBackgroundInteraction}
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={cn(
            "fixed rounded-2xl border border-border bg-background p-4 text-foreground shadow-2xl shadow-black/40 outline-none backdrop-blur-xl",
            !shouldReduceMotion &&
              "transition-[top,left] duration-200 ease-out",
            cardClassName,
          )}
          style={{
            ...cardStyle,
            zIndex: zIndex + 1,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              {title && (
                <h2
                  id={titleId}
                  className="text-sm font-semibold tracking-tight text-foreground"
                >
                  {title}
                </h2>
              )}

              {description && (
                <p
                  id={descriptionId}
                  className="mt-1 text-sm leading-6 text-muted-foreground"
                >
                  {description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={cn(
                "rounded-full border border-border bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition hover:bg-primary/80 hover:text-primary-foreground",
                closeButtonClassName,
              )}
            >
              Close
            </button>
          </div>

          {children && <div className="mt-4">{children}</div>}
        </div>
      )}
    </>
  );
}
