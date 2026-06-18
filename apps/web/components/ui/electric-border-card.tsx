"use client";

import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";

/** Lightning / turbulent core stroke */
const DEFAULT_ARC_COLOR = "#9e0000";
/** Ambient glow, volumetric shadow, background bloom */
const DEFAULT_ACCENT_COLOR = "#000b9e";
const DEFAULT_RADIUS = 24;

function buildElectricPropStyle(
  arcColor: string,
  accentColor: string,
  radius: number,
): CSSProperties | undefined {
  const style: Record<string, string> = {};
  if (arcColor !== DEFAULT_ARC_COLOR) {
    style["--electric-arc-color"] = arcColor;
  }
  if (accentColor !== DEFAULT_ACCENT_COLOR) {
    style["--electric-accent-color"] = accentColor;
  }
  if (radius !== DEFAULT_RADIUS) {
    style["--electric-radius"] = `${radius}px`;
  }
  return Object.keys(style).length > 0 ? (style as CSSProperties) : undefined;
}

const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
};

type ElectricBorderCardElement = "div" | "aside" | "section";

export type ElectricBorderCardProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /**
   * Hover glow: outer/inner box-shadow, background bloom, and soft SVG halo
   * (any CSS color).
   */
  accentColor?: string;
  /** Lightning stroke (core arc + flicker layers) */
  arcColor?: string;
  radius?: number;
  volumetricShadow?: boolean;
  active?: boolean;
  as?: ElectricBorderCardElement;
} & Omit<HTMLAttributes<HTMLElement>, "children">;

function ElectricFilterDefs({
  filterId,
  animate,
}: {
  filterId: string;
  animate: boolean;
}) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed size-0 overflow-hidden"
      style={{ top: -9999, left: -9999, zIndex: -9999 }}
    >
      <defs>
        <filter
          id={filterId}
          colorInterpolationFilters="sRGB"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feTurbulence type="turbulence" baseFrequency="0.03" numOctaves={7} />
          <feColorMatrix type="hueRotate" result="pt1">
            {animate ? (
              <animate
                attributeName="values"
                values="0;360;"
                dur="0.6s"
                repeatCount="indefinite"
                calcMode="paced"
              />
            ) : null}
          </feColorMatrix>
          <feTurbulence
            type="turbulence"
            baseFrequency="0.01"
            numOctaves={7}
            seed={5}
          />
          <feColorMatrix type="hueRotate" result="pt2">
            {animate ? (
              <animate
                attributeName="values"
                values="0; 333; 199; 286; 64; 168; 256; 157; 360;"
                dur="5s"
                repeatCount="indefinite"
                calcMode="paced"
              />
            ) : null}
          </feColorMatrix>
          <feBlend in="pt1" in2="pt2" mode="normal" result="combinedNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="combinedNoise"
            scale={30}
            xChannelSelector="R"
            yChannelSelector="B"
          />
        </filter>
      </defs>
    </svg>
  );
}

export function ElectricBorderCard({
  children,
  className,
  contentClassName,
  arcColor = DEFAULT_ARC_COLOR,
  accentColor = DEFAULT_ACCENT_COLOR,
  radius = DEFAULT_RADIUS,
  volumetricShadow = true,
  active: activeProp,
  as: Component = "div",
  style,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...rest
}: ElectricBorderCardProps) {
  const scopeId = useId().replace(/:/g, "");
  const filterId = `electric-filter-${scopeId}`;
  const grad1Id = `electric-overlay-grad-1-${scopeId}`;
  const grad2Id = `electric-overlay-grad-2-${scopeId}`;

  const reducedMotion = useReducedMotion();
  const [pointerActive, setPointerActive] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [borderSize, setBorderSize] = useState({ width: 0, height: 0 });
  const rootRef = useRef<HTMLElement>(null);
  const borderMeasureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = borderMeasureRef.current;
    if (!node) return;

    const update = () => {
      const { width, height } = node.getBoundingClientRect();
      setBorderSize({ width, height });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const isActive = activeProp ?? (pointerActive || focusWithin);

  const showFullEffect = isActive && !reducedMotion;
  const showStaticArc = isActive && reducedMotion;

  const handleMouseEnter = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      setPointerActive(true);
      onMouseEnter?.(e);
    },
    [onMouseEnter],
  );

  const handleMouseLeave = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      setPointerActive(false);
      onMouseLeave?.(e);
    },
    [onMouseLeave],
  );

  const handleFocus = useCallback(
    (e: FocusEvent<HTMLElement>) => {
      if (e.target === e.currentTarget || rootRef.current?.contains(e.target)) {
        setFocusWithin(true);
      }
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLElement>) => {
      if (!rootRef.current?.contains(e.relatedTarget as Node | null)) {
        setFocusWithin(false);
      }
      onBlur?.(e);
    },
    [onBlur],
  );

  const propStyle = buildElectricPropStyle(arcColor, accentColor, radius);

  const maxGlowStroke = 6;
  const strokeInset = maxGlowStroke / 2 + 1;
  const { width: borderW, height: borderH } = borderSize;
  const hasBorderDims = borderW > 0 && borderH > 0;
  const borderRx = hasBorderDims
    ? Math.min(
        radius,
        (borderW - strokeInset * 2) / 2,
        (borderH - strokeInset * 2) / 2,
      )
    : radius;
  const rectW = Math.max(borderW - strokeInset * 2, 0);
  const rectH = Math.max(borderH - strokeInset * 2, 0);

  const borderRectProps = hasBorderDims
    ? {
        x: strokeInset,
        y: strokeInset,
        width: rectW,
        height: rectH,
        rx: borderRx,
        ry: borderRx,
      }
    : {
        x: strokeInset,
        y: strokeInset,
        width: "100%" as const,
        height: "100%" as const,
        rx: radius,
        ry: radius,
      };

  return (
    <>
      {showFullEffect ? (
        <ElectricFilterDefs filterId={filterId} animate />
      ) : null}

      <Component
        ref={rootRef as Ref<HTMLDivElement>}
        data-electric-scope=""
        data-electric-active={isActive ? "true" : "false"}
        data-electric-volumetric={volumetricShadow ? "true" : "false"}
        className={cn(
          "group/electric relative flex flex-col overflow-visible rounded-(--electric-radius) text-secondary bg-foreground backdrop-blur-[1px] transition-[box-shadow,border-color] duration-300",
          isActive ? "border-transparent" : "border border-border shadow-none",
          showStaticArc && "border-(--electric-arc-color)",
          className,
        )}
        style={{ ...propStyle, ...style }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...rest}
      >
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-(--electric-radius)">
          <div
            className={cn(
              "electric-bloom absolute inset-0 scale-110 blur-[32px] transition-opacity duration-300",
              showFullEffect ? "opacity-10" : "opacity-0",
            )}
          />
        </div>

        <div
          ref={borderMeasureRef}
          className={cn(
            "pointer-events-none absolute inset-0 z-10 transition-opacity duration-300",
            showFullEffect || showStaticArc ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        >
          <svg
            width="100%"
            height="100%"
            className="overflow-visible"
            viewBox={hasBorderDims ? `0 0 ${borderW} ${borderH}` : undefined}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={grad1Id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="white" />
                <stop offset="30%" stopColor="transparent" />
                <stop offset="70%" stopColor="transparent" />
                <stop offset="100%" stopColor="white" />
              </linearGradient>
              <linearGradient id={grad2Id} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="white" />
                <stop offset="30%" stopColor="transparent" />
                <stop offset="70%" stopColor="transparent" />
                <stop offset="100%" stopColor="white" />
              </linearGradient>
            </defs>

            {showFullEffect ? (
              <>
                <rect
                  {...borderRectProps}
                  fill="none"
                  stroke="var(--electric-accent-halo)"
                  strokeWidth={4}
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: "blur(30px)" }}
                />
                <rect
                  {...borderRectProps}
                  fill="none"
                  stroke="var(--electric-accent-halo-soft)"
                  strokeWidth={2}
                  opacity={0.9}
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: "blur(10px)" }}
                />
                <rect
                  className="electric-glow2"
                  {...borderRectProps}
                  fill="none"
                  stroke="var(--electric-arc-color)"
                  strokeWidth={2}
                  opacity={0.7}
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: "blur(1px)" }}
                />
                <rect
                  className="electric-glow1"
                  {...borderRectProps}
                  fill="none"
                  stroke="var(--electric-arc-color)"
                  strokeWidth={4}
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: "blur(10px)" }}
                />
                <rect
                  {...borderRectProps}
                  fill="none"
                  stroke={`url(#${grad1Id})`}
                  strokeWidth={4}
                  opacity={0.9}
                  vectorEffect="non-scaling-stroke"
                  style={{ mixBlendMode: "overlay", filter: "blur(1px)" }}
                />
                <rect
                  {...borderRectProps}
                  fill="none"
                  stroke={`url(#${grad2Id})`}
                  strokeWidth={6}
                  opacity={0.5}
                  vectorEffect="non-scaling-stroke"
                  style={{ mixBlendMode: "overlay", filter: "blur(30px)" }}
                />
              </>
            ) : null}
            {(showFullEffect || showStaticArc) && (
              <rect
                {...borderRectProps}
                fill="none"
                stroke="var(--electric-arc-color)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                style={
                  showFullEffect ? { filter: `url(#${filterId})` } : undefined
                }
              />
            )}
          </svg>
        </div>

        <div
          className={cn(
            "relative z-20 flex min-h-0 flex-1 flex-col overflow-hidden rounded-(--electric-radius)",
            contentClassName,
          )}
        >
          {children}
        </div>
      </Component>
    </>
  );
}
