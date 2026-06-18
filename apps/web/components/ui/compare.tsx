"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { IconDotsVertical } from "@tabler/icons-react";

export type CompareProps = {
  firstImage?: string;
  secondImage?: string;
  className?: string;
  firstImageClassName?: string;
  secondImageClassName?: string;
  initialSliderPercentage?: number;
  slideMode?: "hover" | "drag";
  showHandlebar?: boolean;
  autoplay?: boolean;
  autoplayDuration?: number;
  showPercentage?: boolean;
  showInstructions?: boolean;
  instructionsText?: string;
};

export function Compare({
  firstImage = "https://placehold.co/600x400",
  secondImage = "https://placehold.co/600x400",
  className = "w-full max-w-5xl h-[450px]",
  firstImageClassName,
  secondImageClassName,
  initialSliderPercentage = 50,
  slideMode = "hover",
  showHandlebar = true,
  autoplay = false,
  autoplayDuration = 5000,
  showPercentage = false,
  showInstructions = false,
  instructionsText = "Drag the slider to compare",
}: CompareProps) {
  const [sliderXPercent, setSliderXPercent] = useState(initialSliderPercentage);
  const [isDragging, setIsDragging] = useState(false);

  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  const clampSliderPercent = useCallback(
    (percent: number) => {
      if (!sliderRef.current) {
        return Math.max(0, Math.min(100, percent));
      }

      const { width } = sliderRef.current.getBoundingClientRect();
      const handleInsetPx = showHandlebar ? 10 : 0;
      const minPercent = width > 0 ? (handleInsetPx / width) * 100 : 0;
      const maxPercent = width > 0 ? 100 - minPercent : 100;

      return Math.max(minPercent, Math.min(maxPercent, percent));
    },
    [showHandlebar],
  );

  const updateSliderPosition = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = (x / rect.width) * 100;
      setSliderXPercent(clampSliderPercent(percent));
    },
    [clampSliderPercent],
  );

  const startAutoplay = useCallback(() => {
    if (!autoplay) return;

    const startTime = Date.now();
    const animate = () => {
      const elapsedTime = Date.now() - startTime;
      const progress =
        (elapsedTime % (autoplayDuration * 2)) / autoplayDuration;
      const percentage = progress <= 1 ? progress * 100 : (2 - progress) * 100;

      setSliderXPercent(clampSliderPercent(percentage));
      autoplayRef.current = setTimeout(animate, 16);
    };

    animate();
  }, [autoplay, autoplayDuration, clampSliderPercent]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearTimeout(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay]);

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

  function mouseEnterHandler() {
    stopAutoplay();
  }

  function mouseLeaveHandler() {
    if (slideMode === "hover") {
      setSliderXPercent(initialSliderPercentage);
    }
    startAutoplay();
  }

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

  const handleMouseDown = useCallback(() => handleStart(), [handleStart]);
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => handleMove(e.clientX),
    [handleMove],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!autoplay) {
        handleStart();
      }
    },
    [handleStart, autoplay],
  );

  const handleTouchEnd = useCallback(() => {
    if (!autoplay) {
      handleDragEnd();
    }
  }, [handleDragEnd, autoplay]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (autoplay) return;
      if (slideMode === "hover" || isDraggingRef.current) {
        handleMove(e.touches[0].clientX);
        if (slideMode === "drag") {
          e.preventDefault();
        }
      }
    },
    [handleMove, autoplay, slideMode],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSliderXPercent((prev) => clampSliderPercent(prev - 2));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setSliderXPercent((prev) => clampSliderPercent(prev + 2));
      }
    },
    [clampSliderPercent],
  );

  const slider = (
    <motion.div
      className="pointer-events-none absolute inset-y-0 z-30 w-px -translate-x-1/2 bg-linear-to-b from-transparent from-5% to-95% via-indigo-500 to-transparent"
      style={{
        left: `${sliderXPercent}%`,
        zIndex: 40,
      }}
      transition={{ duration: 0 }}
    >
      <motion.div className="pointer-events-none absolute top-1/2 left-1/2 h-full w-16 -translate-x-1/2 -translate-y-1/2 mask-[radial-gradient(48px_at_center,white,transparent)] bg-linear-to-r from-indigo-400/50 via-transparent to-transparent opacity-50" />
      <motion.div className="pointer-events-none absolute top-1/2 left-1/2 h-1/2 w-8 -translate-x-1/2 -translate-y-1/2 mask-[radial-gradient(24px_at_center,white,transparent)] bg-linear-to-r from-cyan-400/80 via-transparent to-transparent" />
      {showHandlebar && (
        <motion.div
          className={cn(
            "pointer-events-auto absolute top-1/2 left-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md bg-white shadow-[0px_-1px_0px_0px_#FFFFFF40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
            isDragging && "ring-2 ring-blue-400",
          )}
          tabIndex={0}
          role="slider"
          aria-label="Drag to compare"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(sliderXPercent)}
          aria-valuetext={`${Math.round(
            sliderXPercent,
          )} percent first image visible`}
          onKeyDown={handleKeyDown}
        >
          <IconDotsVertical className="h-4 w-4 text-black" />
        </motion.div>
      )}
    </motion.div>
  );

  return (
    <div className="mx-auto flex w-full flex-col items-center">
      <div
        ref={sliderRef}
        className={cn(
          "relative overflow-hidden rounded-2xl select-none touch-none",
          className,
        )}
        style={{
          cursor: slideMode === "drag" ? "grab" : "col-resize",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={mouseLeaveHandler}
        onMouseEnter={mouseEnterHandler}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        <AnimatePresence initial={false}>{slider}</AnimatePresence>
        <div className="overflow-hidden w-full h-full relative z-20 pointer-events-none">
          <AnimatePresence initial={false}>
            {firstImage ? (
              <motion.div
                className={cn(
                  "absolute inset-0 z-20 rounded-2xl shrink-0 w-full h-full select-none overflow-hidden",
                  firstImageClassName,
                )}
                style={{
                  clipPath: `inset(0 ${100 - sliderXPercent}% 0 0)`,
                }}
                transition={{ duration: 0 }}
              >
                <img
                  alt="first image"
                  src={firstImage}
                  className={cn(
                    "absolute inset-0 z-20 h-full w-full shrink-0 select-none rounded-2xl object-cover",
                    firstImageClassName,
                  )}
                  draggable={false}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false}>
          {secondImage ? (
            <motion.img
              className={cn(
                "pointer-events-none absolute left-0 top-0 z-19 h-full w-full select-none rounded-2xl object-cover",
                secondImageClassName,
              )}
              alt="second image"
              src={secondImage}
              draggable={false}
            />
          ) : null}
        </AnimatePresence>
      </div>

      {(showPercentage || showInstructions) && (
        <div className="flex flex-col items-center gap-1 mt-6 px-4">
          {showInstructions && (
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium tracking-wide">
              {instructionsText}
            </div>
          )}
          {showPercentage && (
            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              {Math.round(sliderXPercent)}% / {Math.round(100 - sliderXPercent)}
              %
            </div>
          )}
        </div>
      )}
    </div>
  );
}
