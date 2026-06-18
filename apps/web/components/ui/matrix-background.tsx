"use client";

import { useEffect, useRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const matrixBackgroundRootVariants = cva("overflow-hidden", {
  variants: {
    fixed: {
      true: "fixed inset-0",
      false: "absolute inset-0",
    },
  },
  defaultVariants: {
    fixed: false,
  },
});

const matrixBackgroundLayerVariants = cva(
  "pointer-events-none absolute inset-0 select-none overflow-hidden bg-black",
  {
    variants: {
      opacity: {
        subtle: "opacity-20",
        normal: "opacity-40",
        vivid: "opacity-70",
      },
    },
    defaultVariants: {
      opacity: "subtle",
    },
  },
);

type Speed = "slow" | "normal" | "fast";
type Density = "low" | "medium" | "high";

const SPEED_MAP: Record<Speed, number> = {
  slow: 0.3,
  normal: 0.5,
  fast: 0.75,
};

const DENSITY_MAP: Record<Density, number> = {
  low: 22,
  medium: 16,
  high: 11,
};

const GLYPHS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>+=-*/#$%&";

export type MatrixBackgroundProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof matrixBackgroundRootVariants> &
  VariantProps<typeof matrixBackgroundLayerVariants> & {
    speed?: Speed;
    density?: Density;
    color?: string;
    children?: React.ReactNode;
  };

export const MatrixBackground = ({
  className,
  opacity,
  fixed,
  speed = "normal",
  density = "medium",
  color = "#22c55e",
  children,
  ...props
}: MatrixBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const fontSize = DENSITY_MAP[density];
    const baseSpeed = SPEED_MAP[speed];

    let cols = 0;
    let rows = 0;
    let dpr = 1;

    let downHeads: number[] = [];
    let upHeads: number[] = [];
    let speeds: number[] = [];
    let grid: string[][] = [];

    const randGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

    const setup = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;

      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(width / fontSize);
      rows = Math.ceil(height / fontSize);

      downHeads = Array.from(
        { length: cols },
        () => Math.random() * rows * 0.5,
      );

      upHeads = Array.from(
        { length: cols },
        () => rows * 0.5 + Math.random() * rows * 0.5,
      );

      speeds = Array.from(
        { length: cols },
        () => baseSpeed * (0.6 + Math.random() * 0.8),
      );

      grid = Array.from({ length: cols }, () =>
        Array.from({ length: rows }, randGlyph),
      );
    };

    setup();

    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const delta = Math.min((now - last) / (1000 / 60), 3);
      last = now;

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < cols; i++) {
        const downHead = Math.floor(downHeads[i]);
        const upHead = Math.floor(upHeads[i]);

        // ---------------- DOWN STREAM ----------------
        for (let j = 0; j < 10; j++) {
          const row = downHead - j;
          if (row < 0 || row >= rows) continue;

          ctx.globalAlpha = 1 - j / 10;
          ctx.fillStyle = j === 0 ? "#eaffea" : color;

          ctx.fillText(grid[i][row], i * fontSize, row * fontSize);
        }

        // ---------------- UP STREAM ----------------
        for (let j = 0; j < 10; j++) {
          const row = upHead + j;
          if (row < 0 || row >= rows) continue;

          ctx.globalAlpha = 1 - j / 10;
          ctx.fillStyle = j === 0 ? "#b6ffb6" : color;

          ctx.fillText(grid[i][row], i * fontSize, row * fontSize);
        }

        ctx.globalAlpha = 1;

        const speed = speeds[i] * (delta * 0.55);

        // DOWN
        downHeads[i] += speed;
        if (downHeads[i] > rows + 20) {
          downHeads[i] = -Math.random() * 20;
        }

        // UP
        upHeads[i] -= speed;
        if (upHeads[i] < -20) {
          upHeads[i] = rows + Math.random() * 20;
        }
      }

      raf = requestAnimationFrame(draw);
    };

    if (!reduceMotion) raf = requestAnimationFrame(draw);

    const ro = new ResizeObserver(setup);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [speed, density, color]);

  return (
    <div
      ref={containerRef}
      aria-hidden={children ? undefined : true}
      className={cn(matrixBackgroundRootVariants({ fixed }), className)}
      {...props}
    >
      <div
        aria-hidden="true"
        className={matrixBackgroundLayerVariants({ opacity })}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full pointer-events-none"
        />
      </div>

      {children && (
        <div className="relative z-10 h-full w-full">{children}</div>
      )}
    </div>
  );
};
