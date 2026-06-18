"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface GlassHeaderProps {
  children?: React.ReactNode;
  className?: string;
  /**
   * Static header for embedded templates/previews. Disables window scroll
   * tracking and fixed positioning so the bar stays pinned in its container.
   */
  embedded?: boolean;
}

export function GlassHeader({
  children,
  className,
  embedded = false,
}: GlassHeaderProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (embedded) return;

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [embedded]);

  if (embedded) {
    return (
      <header
        className={cn(
          "relative z-10 shrink-0 border-b border-border/80 bg-background/80 backdrop-blur-md",
          className,
        )}
      >
        <div className="flex min-h-12 w-full items-center px-4 py-2">
          {children}
        </div>
      </header>
    );
  }

  const stage = Math.min(Math.floor(scrollY / 40), 4);

  const stageClasses = [
    "top-0 left-0 right-0 h-20 rounded-none shadow-none border-x-0",
    "top-1 left-2 right-2 h-[4.75rem] rounded-xl shadow-sm",
    "top-2 left-4 right-4 h-[4.5rem] rounded-2xl shadow-md",
    "top-3 left-6 right-6 h-[4.25rem] rounded-2xl shadow-lg",
    "top-4 left-8 right-8 h-16 rounded-2xl shadow-xl",
  ];

  const innerPaddingClasses = ["px-6", "px-5", "px-5", "px-4", "px-4"];

  return (
    <header
      className={cn(
        "fixed z-50 transition-all duration-300 ease-out",
        "backdrop-blur-md bg-white/15 dark:bg-white/10",
        "border border-white/20 dark:border-white/10",
        stageClasses[stage],
        className,
      )}
    >
      <div
        className={cn(
          "flex h-full items-center justify-between transition-all duration-300",
          innerPaddingClasses[stage],
        )}
      >
        {children || (
          <>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg" />
              <span className="font-semibold text-foreground">Brand</span>
            </div>

            <nav className="hidden md:flex items-center gap-3 md:gap-5">
              <Link
                href="/"
                className="text-foreground/80 hover:text-foreground transition-colors"
              >
                Home
              </Link>
              <Link
                href="/"
                className="text-foreground/80 hover:text-foreground transition-colors"
              >
                About
              </Link>
              <Link
                href="/"
                className="text-foreground/80 hover:text-foreground transition-colors"
              >
                Services
              </Link>
              <Link
                href="/"
                className="text-foreground/80 hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </nav>

            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              >
                Sign In
              </Button>
              <Button variant="default">Get Started</Button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
