"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { useMemo, useCallback } from "react";

/* ---------------------------------- */
/* Types                               */
/* ---------------------------------- */

export type CardItem = {
  id: string | number;
  title?: string;
  description?: string;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
};

type Axis = "horizontal" | "vertical";
type Speed = "slow" | "normal" | "fast";

export type InfiniteCardMarqueeProps = {
  cards: CardItem[];
  axis?: Axis;
  reverse?: boolean;
  speed?: Speed;
  pauseOnHover?: boolean;
  cardWidth?: number | string;
  cardHeight?: number | string;
  gap?: number;
  rows?: number;
  rowReverse?: boolean | boolean[];
  rowGap?: number;
  className?: string;
  itemClassName?: string;
  rowClassName?: string;
};

type InfiniteCardMarqueeRowProps = Omit<
  InfiniteCardMarqueeProps,
  "rows" | "rowGap" | "className"
> & {
  rowIndex?: number;
  viewportClassName?: string;
};

/* ---------------------------------- */
/* Animation resolver                 */
/* ---------------------------------- */

const animationMap: Record<
  Axis,
  Record<Speed, { fwd: string; rev: string }>
> = {
  horizontal: {
    slow: {
      fwd: "animate-marquee-slow",
      rev: "animate-marquee-slow-reverse",
    },
    normal: {
      fwd: "animate-marquee",
      rev: "animate-marquee-reverse",
    },
    fast: {
      fwd: "animate-marquee-fast",
      rev: "animate-marquee-fast-reverse",
    },
  },
  vertical: {
    slow: {
      fwd: "animate-marquee-vertical-slow",
      rev: "animate-marquee-vertical-slow-reverse",
    },
    normal: {
      fwd: "animate-marquee-vertical",
      rev: "animate-marquee-vertical-reverse",
    },
    fast: {
      fwd: "animate-marquee-vertical-fast",
      rev: "animate-marquee-vertical-fast-reverse",
    },
  },
};

function getAnimation(axis: Axis, speed: Speed, reverse: boolean) {
  return animationMap[axis][speed][reverse ? "rev" : "fwd"];
}

/* ---------------------------------- */
/* Small helpers                      */
/* ---------------------------------- */

function resolveRowReverse(
  rowIndex: number,
  reverse: boolean,
  rowReverse?: boolean | boolean[],
) {
  if (Array.isArray(rowReverse)) return rowReverse[rowIndex] ?? reverse;
  if (typeof rowReverse === "boolean") return rowReverse;
  return reverse;
}

function offsetCards(cards: CardItem[], rowIndex: number) {
  if (rowIndex === 0 || !cards.length) return cards;
  const offset = rowIndex % cards.length;
  return [...cards.slice(offset), ...cards.slice(0, offset)];
}

/* ---------------------------------- */
/* Styles                             */
/* ---------------------------------- */

const viewportBase = {
  horizontal: "relative w-full overflow-hidden flex",
  vertical: "relative w-full overflow-hidden flex h-[400px] flex-col",
};

const halfBase = {
  horizontal:
    "flex shrink-0 items-center gap-[var(--gap)] pe-[var(--gap)] py-4",
  vertical: "flex shrink-0 flex-col gap-[var(--gap)] px-4 pb-[var(--gap)]",
};

const itemBase = "overflow-hidden transition-all duration-300 hover:scale-105";

/* ---------------------------------- */
/* Row                                */
/* ---------------------------------- */

function InfiniteCardMarqueeRow({
  cards,
  axis = "horizontal",
  reverse = false,
  speed = "normal",
  pauseOnHover = true,
  cardWidth = 300,
  cardHeight = "auto",
  gap = 16,
  rowIndex = 0,
  rowReverse,
  viewportClassName,
  itemClassName,
  rowClassName,
}: InfiniteCardMarqueeRowProps) {
  const isVertical = axis === "vertical";

  const rowCards = useMemo(
    () => offsetCards(cards, rowIndex),
    [cards, rowIndex],
  );

  const dir = resolveRowReverse(rowIndex, reverse, rowReverse);

  const style = useMemo(
    () => ({ "--gap": `${gap}px` } as React.CSSProperties),
    [gap],
  );

  const size = useMemo(() => {
    const h = cardHeight === "auto" ? (isVertical ? 260 : 300) : cardHeight;
    return {
      width: typeof cardWidth === "number" ? `${cardWidth}px` : cardWidth,
      height: typeof h === "number" ? `${h}px` : h,
      flex: "0 0 auto",
    } as React.CSSProperties;
  }, [cardWidth, cardHeight, isVertical]);

  const animation = getAnimation(axis, speed, dir);

  const halfClasses = cn(halfBase[axis], "");

  const viewportClasses = cn(
    viewportBase[axis],
    pauseOnHover && "infinite-marquee-root",
    rowClassName,
    viewportClassName,
  );

  const trackClasses = cn(
    "flex",
    axis === "vertical" ? "flex-col" : "flex-row",
    animation,
    pauseOnHover && "infinite-marquee-track",
  );

  const renderCard = useCallback(
    (card: CardItem, key: string) => (
      <Card
        key={key}
        className={cn(itemBase, itemClassName, card.className)}
        style={size}
      >
        <div className="flex h-full flex-col">
          {(card.title || card.description) && (
            <CardHeader className={card.headerClassName}>
              {card.title && <CardTitle>{card.title}</CardTitle>}
              {card.description && (
                <CardDescription>{card.description}</CardDescription>
              )}
            </CardHeader>
          )}

          {card.content && (
            <CardContent className={card.contentClassName}>
              {card.content}
            </CardContent>
          )}

          {card.footer && (
            <CardFooter className={card.footerClassName}>
              {card.footer}
            </CardFooter>
          )}
        </div>
      </Card>
    ),
    [size, itemClassName],
  );

  const fullSet = useMemo(() => {
    const out: CardItem[] = [];
    for (let i = 0; i < 2; i++) out.push(...rowCards);
    return out;
  }, [rowCards]);

  return (
    <div className={viewportClasses} style={style}>
      <div className={trackClasses}>
        <div className={halfClasses}>
          {fullSet.map((c, i) => renderCard(c, `a-${c.id}-${i}`))}
        </div>

        <div className={cn(halfClasses)} aria-hidden>
          {fullSet.map((c, i) => renderCard(c, `b-${c.id}-${i}`))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- */
/* Main                               */
/* ---------------------------------- */

export function InfiniteCardMarquee({
  rows: rowsProp = 1,
  rowGap = 12,
  className,
  ...rest
}: InfiniteCardMarqueeProps) {
  const rows = Math.max(1, rowsProp);
  const axis = rest.axis ?? "horizontal";
  const multi = rows > 1 && axis === "horizontal";

  if (!multi) {
    return (
      <div className={cn("w-full overflow-hidden", className)}>
        <InfiniteCardMarqueeRow {...rest} axis={axis} rowIndex={0} />
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col overflow-hidden", className)}
      style={{ gap: `${rowGap}px` }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <InfiniteCardMarqueeRow key={i} {...rest} axis={axis} rowIndex={i} />
      ))}
    </div>
  );
}
