"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const gridVariants = cva("relative grid gap-4", {
  variants: {
    columns: {
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    },
  },
  defaultVariants: {
    columns: 3,
  },
});

const cardVariants = cva(
  "group relative overflow-hidden rounded-xl border bg-card transition-all duration-200 ease-out will-change-transform",
  {
    variants: {
      variant: {
        default: "border-border/60",
        glow: "border-primary/30",
        subtle: "border-border/40 bg-muted/40",
      },
      size: {
        sm: "p-4",
        md: "p-5",
        lg: "p-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export type SpotlightGridItem = {
  title: string;
  description: string;
  meta?: string;
};

interface SpotlightGridProps
  extends VariantProps<typeof gridVariants>,
    VariantProps<typeof cardVariants> {
  items: SpotlightGridItem[];
  radius?: number;
  intensity?: number;
  className?: string;
}

export function SpotlightGrid({
  items,
  columns,
  variant,
  size,
  radius = 200,
  intensity = 0.6,
  className,
}: SpotlightGridProps) {
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const mouse = React.useRef({ x: 0, y: 0 });
  const raf = React.useRef<number | null>(null);

  const update = React.useCallback(() => {
    cardRefs.current.forEach((card) => {
      if (!card) return;

      const rect = card.getBoundingClientRect();

      const x = mouse.current.x - rect.left;
      const y = mouse.current.y - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const dx = x - centerX;
      const dy = y - centerY;

      const dist = Math.sqrt(dx * dx + dy * dy);
      const norm = Math.max(0, 1 - dist / radius);
      let boost = norm * intensity;

      if (card.matches(":hover")) {
        boost *= 1.4;
      }

      card.style.setProperty("--x", `${x}px`);
      card.style.setProperty("--y", `${y}px`);
      card.style.setProperty("--boost", boost.toString());
    });

    raf.current = requestAnimationFrame(update);
  }, [radius, intensity]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    mouse.current.x = e.clientX;
    mouse.current.y = e.clientY;

    if (!raf.current) {
      raf.current = requestAnimationFrame(update);
    }
  };

  const handleLeave = () => {
    if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }

    cardRefs.current.forEach((card) => {
      if (!card) return;
      card.style.removeProperty("--boost");
    });
  };

  React.useEffect(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn(gridVariants({ columns }), className)}
    >
      {items.map((item, i) => (
        <div
          key={`${item.title}-${i}`}
          ref={(el) => {
            if (el) {
              cardRefs.current[i] = el;
            }
          }}
          className={cn(cardVariants({ variant, size }))}
          style={{
            transform:
              "translateY(calc(var(--boost, 0) * -6px)) scale(calc(1 + var(--boost, 0) * 0.04))",
            boxShadow:
              "0 20px 40px -20px rgba(0,0,0,calc(0.2 + var(--boost, 0) * 0.3))",
            backgroundImage: `
              radial-gradient(
                ${radius}px circle at var(--x, 50%) var(--y, 50%),
                rgba(255,255,255,calc(0.1 + var(--boost, 0) * 0.25)),
                transparent 60%
              )
            `,
          }}
        >
          {/* Glow overlay */}
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-linear-to-b from-background to-transparent" />

          {/* Content */}
          <div className="relative z-10 space-y-2">
            <h3 className="text-sm font-semibold">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            {item.meta && (
              <p className="text-xs text-muted-foreground/80">{item.meta}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
