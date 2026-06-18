"use client";

import * as React from "react";

type ShimmerButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ReactNode;
  title?: string;
  className?: string;
};

export const ShimmerButton = React.forwardRef<
  HTMLButtonElement,
  ShimmerButtonProps
>(({ icon, title = "Action", className = "", ...props }, ref) => {
  return (
    <button
      ref={ref}
      {...props}
      className={[
        "group relative w-full",
        "px-4 py-2 rounded-lg",
        "backdrop-blur-xl",
        "border-2 border-primary/30",
        "bg-linear-to-br from-primary/40 via-black/60 to-black/80",
        "hover:scale-[1.02] hover:-translate-y-1 active:scale-95",
        "transition-all duration-500 ease-out",
        "cursor-pointer overflow-hidden",
        "hover:border-primary/60",
        className,
      ].join(" ")}
    >
      {/* Shimmer sweep */}
      <div
        className="
            absolute inset-0
            bg-linear-to-r from-transparent via-primary/30 to-transparent
            -translate-x-full group-hover:translate-x-full
            transition-transform duration-1000 ease-out
          "
      />

      {/* Glow overlay */}
      <div
        className="
            absolute inset-0
            bg-linear-to-r from-primary/10 via-primary/20 to-primary/10
            opacity-0 group-hover:opacity-100
            transition-opacity duration-500
          "
      />

      {/* Content */}
      <div className="relative z-10 flex items-center gap-4">
        {/* Text */}
        <div className="flex-1">
          <p className="text-primary text-sm font-bold group-hover:text-primary-300 transition-colors duration-300">
            {title}
          </p>
        </div>
      </div>
    </button>
  );
});
