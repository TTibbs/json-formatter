"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  motion,
  type Transition,
  type Variant,
  type Variants,
} from "motion/react";
import { cn } from "@/lib/utils";

const DEFAULT_EASE = [0.25, 0.1, 0.25, 1] as const;

export const revealRootVariants = cva("w-full", {
  variants: {
    display: {
      block: "block",
      inline: "inline-block w-auto max-w-full",
    },
  },
  defaultVariants: {
    display: "block",
  },
});

export type RevealAnimation =
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right"
  | "scale-in"
  | "scale-up"
  | "blur-in"
  | "blur-up"
  | "flip-up"
  | "flip-left"
  | "rotate-in";

const animations: Record<
  RevealAnimation,
  { hidden: Variant; visible: Variant }
> = {
  "fade-up": {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-down": {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-left": {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
  "fade-right": {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
  "slide-up": {
    hidden: { opacity: 0, y: 80 },
    visible: { opacity: 1, y: 0 },
  },
  "slide-down": {
    hidden: { opacity: 0, y: -80 },
    visible: { opacity: 1, y: 0 },
  },
  "slide-left": {
    hidden: { opacity: 0, x: 80 },
    visible: { opacity: 1, x: 0 },
  },
  "slide-right": {
    hidden: { opacity: 0, x: -80 },
    visible: { opacity: 1, x: 0 },
  },
  "scale-in": {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  },
  "scale-up": {
    hidden: { opacity: 0, scale: 0.5, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
  },
  "blur-in": {
    hidden: { opacity: 0, filter: "blur(10px)" },
    visible: { opacity: 1, filter: "blur(0px)" },
  },
  "blur-up": {
    hidden: { opacity: 0, filter: "blur(10px)", y: 30 },
    visible: { opacity: 1, filter: "blur(0px)", y: 0 },
  },
  "flip-up": {
    hidden: { opacity: 0, rotateX: 90, y: 20 },
    visible: { opacity: 1, rotateX: 0, y: 0 },
  },
  "flip-left": {
    hidden: { opacity: 0, rotateY: 90 },
    visible: { opacity: 1, rotateY: 0 },
  },
  "rotate-in": {
    hidden: { opacity: 0, rotate: -10, scale: 0.95 },
    visible: { opacity: 1, rotate: 0, scale: 1 },
  },
};

function buildItemVariants(
  hidden: Variant,
  visible: Variant,
  duration: number,
): Variants {
  return {
    hidden,
    visible: {
      ...visible,
      transition: {
        duration,
        ease: [...DEFAULT_EASE] as [number, number, number, number],
      },
    },
  };
}

function normalizeEase(easing: Transition["ease"]): Transition["ease"] {
  if (typeof easing === "string") {
    return easing as Transition["ease"];
  }
  if (
    Array.isArray(easing) &&
    easing.length === 4 &&
    easing.every((n) => typeof n === "number")
  ) {
    const [a, b, c, d] = easing as number[];
    return [a, b, c, d] as [number, number, number, number];
  }
  const [a, b, c, d] = DEFAULT_EASE;
  return [a, b, c, d];
}

export interface RevealProps extends VariantProps<typeof revealRootVariants> {
  children: React.ReactNode;
  animation?: RevealAnimation;
  delay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
  easing?: Transition["ease"];
  className?: string;
  disabled?: boolean;
  onReveal?: () => void;
}

export function Reveal({
  children,
  animation = "fade-up",
  delay = 0,
  duration = 0.5,
  easing = [...DEFAULT_EASE] as [number, number, number, number],
  className,
  display,
  disabled = false,
  onReveal,
}: RevealProps) {
  if (disabled) {
    return (
      <div className={cn(revealRootVariants({ display }), className)}>
        {children}
      </div>
    );
  }

  const { hidden, visible } = animations[animation];

  const transition: Transition = {
    duration,
    delay,
    ease: normalizeEase(easing),
  };

  const flipStyle =
    animation.includes("flip") || animation === "rotate-in"
      ? { perspective: 1000, transformStyle: "preserve-3d" as const }
      : undefined;

  return (
    <motion.div
      initial="visible"
      animate="visible"
      variants={{ hidden, visible }}
      transition={transition}
      className={cn(revealRootVariants({ display }), className)}
      style={flipStyle}
      onAnimationComplete={() => {
        onReveal?.();
      }}
    >
      {children}
    </motion.div>
  );
}

export type RevealTextAnimation = "fade-up" | "blur-in" | "slide-up";

export interface RevealTextProps extends VariantProps<
  typeof revealRootVariants
> {
  children: string;
  by?: "word" | "character";
  animation?: RevealTextAnimation;
  staggerDelay?: number;
  delay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
  className?: string;
}

export function RevealText({
  children,
  by = "word",
  animation = "fade-up",
  staggerDelay = 0.03,
  delay = 0,
  duration = 0.4,
  className,
  display,
}: RevealTextProps) {
  const units = (
    by === "word" ? children.split(/\s+/) : children.split("")
  ).filter((u) => u.length > 0);

  const { hidden, visible } = animations[animation];

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  };

  const unitVariants = React.useMemo(
    () => buildItemVariants(hidden, visible, duration),
    [hidden, visible, duration],
  );

  return (
    <motion.span
      initial="visible"
      animate="visible"
      variants={containerVariants}
      className={cn(revealRootVariants({ display }), className)}
      style={{ display: "inline-flex", flexWrap: "wrap" }}
    >
      {units.map((unit, index) => (
        <motion.span
          key={`${unit}-${index}`}
          variants={unitVariants}
          style={{ display: "inline-block", whiteSpace: "pre" }}
        >
          {by === "word"
            ? index < units.length - 1
              ? `${unit} `
              : unit
            : unit}
        </motion.span>
      ))}
    </motion.span>
  );
}
