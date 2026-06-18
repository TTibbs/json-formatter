"use client";

import type React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type LaptopShowcaseProps = {
  /** Screen image. Ignored when `children` is provided. */
  image?: string;
  imageAlt?: string;
  /** Custom screen content. Overrides `image`. */
  children?: React.ReactNode;
  className?: string;
};

export function LaptopShowcase({
  image = "/laptop-screen.png",
  imageAlt = "Laptop screen content",
  children,
  className,
}: LaptopShowcaseProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn("group block w-full select-none", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ perspective: "1800px" }}
    >
      <div
        className="transition-transform duration-500 ease-out will-change-transform"
        style={{
          transformStyle: "preserve-3d",
          transform: open
            ? "rotateX(8deg) translateY(-6px)"
            : "rotateX(14deg) translateY(0)",
        }}
      >
        {/* Screen / lid */}
        <div
          className="relative mx-auto w-[80%]"
          style={{
            transformOrigin: "bottom center",
            transformStyle: "preserve-3d",
            transform: open ? "rotateX(-5deg)" : "rotateX(-93deg)",
            transition: "transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div className="relative aspect-16/10 w-full rounded-t-xl rounded-b-md bg-neutral-900 p-[2.5%] shadow-2xl ring-1 ring-black/40">
            {/* Camera notch */}
            <div className="absolute left-1/2 top-[3%] z-20 h-1 w-1 -translate-x-1/2 rounded-full bg-neutral-700" />

            {/* Bezel + screen */}
            <div className="relative h-full w-full overflow-hidden rounded-md bg-black">
              {/* Screen content */}
              <div
                className="absolute inset-0 transition-all ease-out"
                style={{
                  opacity: open ? 1 : 0,
                  transform: open ? "scale(1)" : "scale(1.04)",
                  filter: open ? "blur(0px)" : "blur(6px)",
                  transitionDuration: "500ms",
                  transitionDelay: open ? "150ms" : "0ms",
                }}
              >
                {children ?? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image || "/placeholder.svg"}
                    alt={imageAlt}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              {/* Glossy reflection overlay */}
              <div
                className="pointer-events-none absolute inset-0 z-10"
                style={{
                  background:
                    "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 18%, rgba(255,255,255,0) 38%)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Base / keyboard deck */}
        <div
          className="relative mx-auto h-3 w-full"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="absolute inset-x-0 top-0 mx-auto h-2.5 w-full rounded-b-xl bg-linear-to-b from-neutral-300 to-neutral-400 shadow-md">
            {/* Notch / lid opening lip */}
            <div className="absolute left-1/2 top-0 h-1.5 w-[16%] -translate-x-1/2 rounded-b-md bg-neutral-400" />
          </div>
        </div>
      </div>

      {/* Soft ground shadow */}
      <div
        className="mx-auto h-5 rounded-[50%] bg-black/30 blur-xl transition-all duration-500 ease-out"
        style={{
          width: open ? "78%" : "70%",
          opacity: open ? 0.45 : 0.3,
        }}
      />
    </div>
  );
}
