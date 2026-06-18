"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { IconDotsVertical } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export type JsonCompareSliderProps = {
  before: React.ReactNode;
  after: React.ReactNode;
  className?: string;
  initialSliderPercentage?: number;
  slideMode?: "hover" | "drag";
};

export function JsonCompareSlider({
  before,
  after,
  className = "w-full h-[280px] md:h-[320px]",
  initialSliderPercentage = 50,
  slideMode = "drag",
}: JsonCompareSliderProps) {
  const [sliderXPercent, setSliderXPercent] = useState(initialSliderPercentage);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const clampSliderPercent = useCallback((percent: number) => {
    if (!sliderRef.current) {
      return Math.max(0, Math.min(100, percent));
    }
    const { width } = sliderRef.current.getBoundingClientRect();
    const handleInsetPx = 10;
    const minPercent = width > 0 ? (handleInsetPx / width) * 100 : 0;
    const maxPercent = width > 0 ? 100 - minPercent : 100;
    return Math.max(minPercent, Math.min(maxPercent, percent));
  }, []);

  const updateSliderPosition = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const percent = ((clientX - rect.left) / rect.width) * 100;
      setSliderXPercent(clampSliderPercent(percent));
    },
    [clampSliderPercent],
  );

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (slideMode !== "drag") return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      updateSliderPosition(e.clientX);
    };

    document.addEventListener("mouseup", handleDragEnd);
    document.addEventListener("mousemove", handleDocumentMouseMove);
    return () => {
      document.removeEventListener("mouseup", handleDragEnd);
      document.removeEventListener("mousemove", handleDocumentMouseMove);
    };
  }, [slideMode, handleDragEnd, updateSliderPosition]);

  const handleStart = useCallback(() => {
    if (slideMode === "drag") {
      isDraggingRef.current = true;
      setIsDragging(true);
    }
  }, [slideMode]);

  const handleMove = useCallback(
    (clientX: number) => {
      if (slideMode === "hover") {
        updateSliderPosition(clientX);
      } else if (slideMode === "drag" && isDraggingRef.current) {
        updateSliderPosition(clientX);
      }
    },
    [slideMode, updateSliderPosition],
  );

  return (
    <div
      ref={sliderRef}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60 bg-card select-none touch-none",
        className,
      )}
      style={{ cursor: slideMode === "drag" ? "grab" : "col-resize" }}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseLeave={() => {
        if (slideMode === "hover") {
          setSliderXPercent(initialSliderPercentage);
        }
      }}
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      onTouchEnd={handleDragEnd}
      onTouchMove={(e) => {
        if (slideMode === "hover" || isDraggingRef.current) {
          handleMove(e.touches[0]!.clientX);
        }
      }}
    >
      <div className="absolute inset-0 z-10">{after}</div>
      <div
        className="absolute inset-0 z-20 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderXPercent}% 0 0)` }}
      >
        {before}
      </div>
      <motion.div
        className="pointer-events-none absolute inset-y-0 z-30 w-px -translate-x-1/2 bg-linear-to-b from-transparent from-5% to-95% via-emerald-500 to-transparent"
        style={{ left: `${sliderXPercent}%` }}
      >
        <div
          className={cn(
            "pointer-events-auto absolute top-1/2 left-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md bg-white shadow-md",
            isDragging && "ring-2 ring-emerald-400",
          )}
          tabIndex={0}
          role="slider"
          aria-label="Drag to compare before and after JSON"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(sliderXPercent)}
        >
          <IconDotsVertical className="h-4 w-4 text-black" />
        </div>
      </motion.div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-40 rounded-md bg-background/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
        Before
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-40 rounded-md bg-background/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
        After
      </div>
    </div>
  );
}
