"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  ComponentProps,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------- */
/* GRID VARIANTS */
/* ---------------------------------- */

const gridVariants = cva("grid auto-rows-[minmax(8rem,auto)]", {
  variants: {
    columns: {
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    },
    gap: {
      sm: "gap-3",
      md: "gap-4",
      lg: "gap-6",
    },
  },
  defaultVariants: {
    columns: 4,
    gap: "md",
  },
});

const spanVariants = cva("min-h-0 min-w-0", {
  variants: {
    colSpan: {
      1: "col-span-1",
      2: "col-span-1 sm:col-span-2",
      3: "col-span-1 sm:col-span-2 lg:col-span-3",
      4: "col-span-1 sm:col-span-2 lg:col-span-4",
    },
    rowSpan: {
      1: "row-span-1",
      2: "row-span-2",
      3: "row-span-3",
      4: "row-span-4",
    },
  },
  defaultVariants: {
    colSpan: 1,
    rowSpan: 1,
  },
});

/* ---------------------------------- */
/* TYPES */
/* ---------------------------------- */

export type BentoGridProps = ComponentProps<"div"> &
  VariantProps<typeof gridVariants>;

export type BentoItemProps = ComponentProps<"div"> &
  VariantProps<typeof spanVariants>;

/* ---------------------------------- */
/* GRID (HOST FOR SPOTLIGHT LAYER) */
/* ---------------------------------- */

export function BentoGrid({
  columns,
  gap,
  className,
  children,
  ...props
}: BentoGridProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={hostRef} className="relative">
      <div
        ref={gridRef}
        data-slot="bento-grid"
        className={cn(gridVariants({ columns, gap }), className)}
        {...props}
      >
        {children}
      </div>
      <BentoSpotlight
        gridRef={gridRef as RefObject<HTMLDivElement>}
        hostRef={hostRef as RefObject<HTMLDivElement>}
      />
    </div>
  );
}

/* ---------------------------------- */
/* ITEM */
/* ---------------------------------- */

export function BentoItem({
  colSpan,
  rowSpan,
  className,
  children,
  ...props
}: BentoItemProps) {
  return (
    <div
      data-slot="bento-item"
      className={cn(
        spanVariants({ colSpan, rowSpan }),
        "relative z-0 rounded-xl border border-border/60 bg-card text-card-foreground transition-transform duration-300 ease-out will-change-transform hover:scale-[1.02]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ---------------------------------- */
/* SPOTLIGHT LAYER */
/* ---------------------------------- */

type RectState = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const LERP = 0.12;
const OPACITY_LERP = 0.14;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function measureItemInHost(el: HTMLElement, host: HTMLElement): RectState {
  const r = el.getBoundingClientRect();
  const h = host.getBoundingClientRect();
  return {
    top: r.top - h.top,
    left: r.left - h.left,
    width: r.width,
    height: r.height,
  };
}

function applySpotlightRect(el: HTMLDivElement, rect: RectState) {
  el.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
}

function BentoSpotlight({
  gridRef,
  hostRef,
}: {
  gridRef: RefObject<HTMLDivElement>;
  hostRef: RefObject<HTMLDivElement>;
}) {
  const [layerMounted, setLayerMounted] = useState(false);
  const activeItemRef = useRef<HTMLElement | null>(null);
  const targetRef = useRef<RectState | null>(null);
  const currentRef = useRef<RectState | null>(null);
  const opacityRef = useRef(0);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const syncTargetRect = useCallback(() => {
    const host = hostRef.current;
    const el = activeItemRef.current;
    if (!host || !el) return;
    targetRef.current = measureItemInHost(el, host);
    setLayerMounted(true);
  }, [hostRef]);

  const updateRect = useCallback(
    (el: HTMLElement | null) => {
      if (!el || !hostRef.current) return;
      activeItemRef.current = el;
      syncTargetRect();
    },
    [hostRef, syncTargetRect],
  );

  const clear = useCallback(() => {
    activeItemRef.current = null;
    targetRef.current = null;
  }, []);

  useEffect(() => {
    let raf = 0;

    const animate = () => {
      const target = targetRef.current;
      const spotlight = spotlightRef.current;
      let current = currentRef.current;

      const opacityGoal = target ? 1 : 0;
      opacityRef.current = lerp(opacityRef.current, opacityGoal, OPACITY_LERP);

      if (target) {
        if (!current) {
          current = { ...target };
        } else {
          current = {
            top: lerp(current.top, target.top, LERP),
            left: lerp(current.left, target.left, LERP),
            width: lerp(current.width, target.width, LERP),
            height: lerp(current.height, target.height, LERP),
          };
        }
        currentRef.current = current;

        if (spotlight && current) {
          applySpotlightRect(spotlight, current);
          spotlight.style.opacity = String(opacityRef.current);
        }
      } else if (current && spotlight) {
        spotlight.style.opacity = String(opacityRef.current);
        if (opacityRef.current < 0.02) {
          currentRef.current = null;
          setLayerMounted(false);
        }
      }

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const root = gridRef.current;
    if (!root) return;

    const items = root.querySelectorAll<HTMLElement>(
      "[data-slot='bento-item']",
    );

    const handlers: (() => void)[] = [];

    items.forEach((el) => {
      const enter = () => updateRect(el);
      const leave = (e: MouseEvent) => {
        const next = e.relatedTarget;
        if (next instanceof Node && root.contains(next)) return;
        clear();
      };

      el.addEventListener("mouseenter", enter);
      el.addEventListener("mouseleave", leave);

      handlers.push(() => {
        el.removeEventListener("mouseenter", enter);
        el.removeEventListener("mouseleave", leave);
      });
    });

    const onLayoutChange = () => {
      if (activeItemRef.current) {
        syncTargetRect();
      }
    };

    window.addEventListener("scroll", onLayoutChange, true);
    window.addEventListener("resize", onLayoutChange);

    return () => {
      handlers.forEach((h) => h());
      window.removeEventListener("scroll", onLayoutChange, true);
      window.removeEventListener("resize", onLayoutChange);
    };
  }, [gridRef, updateRect, clear, syncTargetRect]);

  if (!layerMounted) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      aria-hidden
    >
      <div
        ref={spotlightRef}
        className="absolute left-0 top-0 will-change-[transform,width,height,opacity]"
        style={{
          opacity: 0,
          transform: "translate3d(0, 0, 0)",
        }}
      >
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            background:
              "radial-gradient(circle at center, rgba(99,102,241,0.18), transparent 70%)",
            boxShadow:
              "0 0 40px rgba(99,102,241,0.25), 0 0 120px rgba(99,102,241,0.12)",
            filter: "blur(1px)",
          }}
        />
        <div
          className="absolute inset-0 rounded-xl border border-indigo-400/40"
          style={{
            mixBlendMode: "overlay",
          }}
        />
      </div>
    </div>
  );
}
