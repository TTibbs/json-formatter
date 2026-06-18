"use client";

import { useEffect, useState } from "react";
import { cva } from "class-variance-authority";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { cn } from "@/lib/utils";

const EASE = [0.25, 0.1, 0.25, 1] as const;

const rotatingTextItemVariants = cva("inline-block whitespace-pre");

const highlightWrapperClassName =
  "inline-flex items-center justify-center overflow-hidden rounded-md bg-primary/15 px-1.5 py-0.5 text-primary whitespace-nowrap";

export type RotatingTextProps = Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  items: readonly string[];
  intervalMs?: number;
  startIndex?: number;
  /** Vertical motion distance in px (ignored when reduced motion is on) */
  yOffset?: number;
  motionTransition?: Transition;
  /** Additional classes applied to both measured and animated text items */
  itemClassName?: string;
  /**
   * `default` reserves space for the longest phrase to limit layout shift.
   * `highlight` sizes a pill to each phrase and animates width between rotations.
   */
  variant?: "default" | "highlight";
};

type RotatingTextAnimatedItemProps = {
  current: string;
  index: number;
  reduceMotion: boolean | null;
  yOffset: number;
  transition: Transition;
  className?: string;
};

function RotatingTextAnimatedItem({
  current,
  index,
  reduceMotion,
  yOffset,
  transition,
  className,
}: RotatingTextAnimatedItemProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={`${index}-${current}`}
        initial={
          reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: yOffset }
        }
        animate={{ opacity: 1, y: 0 }}
        exit={
          reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -yOffset }
        }
        transition={transition}
        className={className}
      >
        {current}
      </motion.span>
    </AnimatePresence>
  );
}

export function RotatingText({
  items,
  intervalMs = 2400,
  startIndex = 0,
  yOffset = 12,
  variant = "default",
  motionTransition,
  itemClassName,
  className,
  ...props
}: RotatingTextProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(0, startIndex), Math.max(0, items.length - 1)),
  );

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [items.length, intervalMs]);

  const current = items[index] ?? "";
  if (items.length === 0) return null;

  const transition: Transition = reduceMotion
    ? { duration: 0 }
    : (motionTransition ?? { duration: 0.35, ease: EASE });

  const itemClasses = cn(rotatingTextItemVariants({ className: itemClassName }));

  const liveRegionProps = {
    "aria-live": "polite" as const,
    "aria-atomic": "true" as const,
    ...props,
  };

  if (variant === "highlight") {
    return (
      <span
        className={cn("inline-block min-h-[1.2em] align-baseline", className)}
        {...liveRegionProps}
      >
        <motion.span
          layout={reduceMotion ? false : "size"}
          transition={{ layout: transition }}
          className={highlightWrapperClassName}
        >
          <RotatingTextAnimatedItem
            current={current}
            index={index}
            reduceMotion={reduceMotion}
            yOffset={yOffset}
            transition={transition}
            className={itemClasses}
          />
        </motion.span>
      </span>
    );
  }

  return (
    <span
      className={cn("inline-grid min-h-[1.2em] items-center", className)}
      {...liveRegionProps}
    >
      <span
        aria-hidden="true"
        className="invisible col-start-1 row-start-1 inline-grid whitespace-nowrap"
      >
        {items.map((item, itemIndex) => (
          <span
            key={`measure-${itemIndex}-${item}`}
            className={cn("col-start-1 row-start-1", itemClasses)}
          >
            {item}
          </span>
        ))}
      </span>
      <RotatingTextAnimatedItem
        current={current}
        index={index}
        reduceMotion={reduceMotion}
        yOffset={yOffset}
        transition={transition}
        className={cn("col-start-1 row-start-1", itemClasses)}
      />
    </span>
  );
}
