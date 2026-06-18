"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PixelRevealCardProps {
  image: string;
  name: string;
  role: string;
  /** Approximate size (in px) of each pixel tile. Smaller = more pixels = denser effect. Default 18. */
  pixelSize?: number;
  /** Total reveal/reassemble duration in ms. Default 850. */
  animationDuration?: number;
  className?: string;
}

const CARD_W = 320;
const CARD_H = 400;

const PIXEL_COLORS = [
  "var(--pixel-reveal-1)",
  "var(--pixel-reveal-2)",
  "var(--pixel-reveal-3)",
  "var(--pixel-reveal-4)",
  "var(--pixel-reveal-5)",
  "var(--pixel-reveal-6)",
  "var(--pixel-reveal-7)",
  "var(--pixel-reveal-8)",
] as const;

interface PixelDef {
  id: number;
  row: number;
  col: number;
  /** normalized position 0..1 */
  x: number;
  y: number;
  /** direction vector pointing outward from center */
  dx: number;
  dy: number;
  /** how far this pixel drifts (px) — varied for organic feel */
  distance: number;
  /** per-pixel stagger delay 0..1 (fraction of total duration) */
  delay: number;
  baseOpacity: number;
  colorIndex: number;
}
export function PixelRevealCard({
  image,
  name,
  role,
  pixelSize = 18,
  animationDuration = 850,
  className,
}: PixelRevealCardProps) {
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { pixels, cols, rows } = useMemo(() => {
    const cols = Math.ceil(CARD_W / pixelSize);
    const rows = Math.ceil(CARD_H / pixelSize);
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    const maxDistFromCenter = Math.hypot(cx, cy);
    const pixels: PixelDef[] = [];
    let id = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // direction outward from center
        let vx = col - cx;
        let vy = row - cy;
        const len = Math.hypot(vx, vy) || 1;
        vx /= len;
        vy /= len;
        // deterministic-ish jitter so it's stable across renders
        const seed = Math.sin(id * 12.9898) * 43758.5453;
        const rand = seed - Math.floor(seed);
        const seed2 = Math.sin(id * 78.233) * 12543.123;
        const rand2 = seed2 - Math.floor(seed2);
        // organic jitter on the outward vector
        const jitterAngle = (rand - 0.5) * 0.9;
        const cos = Math.cos(jitterAngle);
        const sin = Math.sin(jitterAngle);
        const jvx = vx * cos - vy * sin;
        const jvy = vx * sin + vy * cos;
        // pixels closer to edge drift farther; add randomness so some go farther
        const distRatio = len / maxDistFromCenter;
        const distance = (90 + distRatio * 150) * (0.7 + rand2 * 0.8);
        // staggered: center pixels leave first, edges trail — plus jitter
        const delay = distRatio * 0.45 + rand * 0.25;
        pixels.push({
          id: id++,
          row,
          col,
          x: col / cols,
          y: row / rows,
          dx: jvx,
          dy: jvy,
          distance,
          delay: Math.min(delay, 0.9),
          baseOpacity: 0.82 + rand * 0.18,
          colorIndex: Math.floor(rand2 * PIXEL_COLORS.length),
        });
      }
    }
    return {
      pixels,
      cols,
      rows,
    };
  }, [pixelSize]);
  const durationS = animationDuration / 1000;
  return (
    <motion.div
      className={cn("relative select-none rounded-2xl", className)}
      style={{
        width: CARD_W,
        height: CARD_H,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      tabIndex={0}
      aria-label={`${name}, ${role}`}
      initial={false}
      animate={{
        boxShadow: hovered
          ? "10px 14px 36px -6px rgba(0, 135, 60, 0.35), 6px 8px 20px -4px rgba(0, 0, 0, 0.45)"
          : "8px 12px 28px -6px rgba(0, 0, 0, 0.5)",
      }}
      transition={{
        duration: 0.4,
        ease: "easeOut",
      }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-2xl bg-pixel-reveal-fallback">
        {/* Underlying image — revealed as pixels disperse */}
        <motion.img
          src={image}
          alt={name}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            willChange: "opacity, transform",
          }}
          initial={false}
          animate={{
            opacity: hovered ? 1 : 0,
            scale: hovered ? 1 : 1.06,
          }}
          transition={{
            duration: durationS * 0.7,
            delay: hovered ? durationS * 0.25 : 0,
            ease: "easeOut",
          }}
        />

        {/* Gradient + info overlay (always visible, sits above image) */}
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end">
          <div className="bg-linear-to-t from-black/85 via-black/30 to-transparent p-5">
            <motion.h3
              className="text-lg font-semibold tracking-tight text-white"
              initial={false}
              animate={{
                y: hovered ? 0 : 6,
                opacity: hovered ? 1 : 0.92,
              }}
              transition={{
                duration: 0.4,
                ease: "easeOut",
              }}
            >
              {name}
            </motion.h3>
            <motion.p
              className="text-sm text-indigo-200/80"
              initial={false}
              animate={{
                y: hovered ? 0 : 6,
                opacity: hovered ? 1 : 0.7,
              }}
              transition={{
                duration: 0.4,
                delay: 0.04,
                ease: "easeOut",
              }}
            >
              {role}
            </motion.p>
          </div>
        </div>

        {/* Pixel layer — client-only to avoid Framer Motion SSR style mismatches */}
        <div
          className="absolute inset-0 z-10"
          style={
            mounted
              ? {
                  display: "grid",
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gridTemplateRows: `repeat(${rows}, 1fr)`,
                }
              : undefined
          }
          aria-hidden="true"
        >
          {mounted ? (
            pixels.map((p) => {
              const opacity = Math.round(p.baseOpacity * 1000) / 1000;

              return (
                <motion.span
                  key={p.id}
                  className="block"
                  style={{
                    backgroundColor: PIXEL_COLORS[p.colorIndex],
                    willChange: "transform, opacity",
                  }}
                  initial={false}
                  animate={
                    hovered
                      ? {
                          x: p.dx * p.distance,
                          y: p.dy * p.distance,
                          opacity: 0,
                          scale: 0.4,
                        }
                      : {
                          x: 0,
                          y: 0,
                          opacity,
                          scale: 1,
                        }
                  }
                  transition={{
                    duration: durationS,
                    delay: hovered
                      ? p.delay * durationS
                      : p.delay * durationS * 0.05,
                    ease: hovered ? [0.22, 1, 0.36, 1] : [0.4, 0, 0.2, 1],
                  }}
                />
              );
            })
          ) : (
            <div className="h-full w-full bg-pixel-reveal-fallback" />
          )}
        </div>

        {/* Inner border to keep rounded corners crisp over pixels */}
        <div className="pointer-events-none absolute inset-0 z-30 rounded-2xl ring-1 ring-inset ring-white/10" />
      </div>
    </motion.div>
  );
}
