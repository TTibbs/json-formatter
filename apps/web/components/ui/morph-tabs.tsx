"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const morphTabsVariants = cva(
  "inline-flex max-w-full items-center gap-1 rounded-xl border border-border/70 bg-muted/40 px-2 py-5",
  {
    variants: {
      size: {
        sm: "min-h-9",
        default: "min-h-11",
        lg: "min-h-12",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const morphTabsTriggerVariants = cva(
  "relative z-10 inline-flex shrink-0 flex-none items-center justify-center whitespace-nowrap rounded-lg px-2.5 font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:px-3",
  {
    variants: {
      size: {
        sm: "h-7 text-xs",
        default: "h-9 text-sm",
        lg: "h-10 text-sm",
      },
      active: {
        true: "text-foreground",
        false: "text-muted-foreground hover:text-foreground/90",
      },
    },
    defaultVariants: {
      size: "default",
      active: false,
    },
  },
);

export interface MorphTabsProps extends VariantProps<typeof morphTabsVariants> {
  tabs: string[];
  active?: string;
  defaultActive?: string;
  onActiveChange?: (value: string) => void;
  panels?: Record<string, React.ReactNode>;
  panelClassName?: string;
  glow?: boolean;
  glowIntensity?: "subtle" | "default" | "strong";
  glowColor?: string;
  className?: string;
}

/** Scroll the tab strip horizontally only - avoids document scroll from scrollIntoView. */
function scrollActiveTabIntoListView(
  tabsListEl: HTMLElement,
  activeEl: HTMLElement,
  behavior: ScrollBehavior,
) {
  const tabLeft = activeEl.offsetLeft;
  const tabRight = tabLeft + activeEl.offsetWidth;
  const visibleLeft = tabsListEl.scrollLeft;
  const visibleRight = visibleLeft + tabsListEl.clientWidth;

  if (tabLeft < visibleLeft) {
    tabsListEl.scrollTo({ left: tabLeft, behavior });
  } else if (tabRight > visibleRight) {
    tabsListEl.scrollTo({
      left: tabRight - tabsListEl.clientWidth,
      behavior,
    });
  }
}

export function MorphTabs({
  tabs,
  active,
  defaultActive,
  onActiveChange,
  panels,
  panelClassName,
  glow = true,
  glowIntensity = "default",
  glowColor = "rgb(129 140 248)",
  className,
  size,
}: MorphTabsProps) {
  const fallbackTab = tabs[0] ?? "";
  const [internalActive, setInternalActive] = React.useState(
    defaultActive ?? active ?? fallbackTab,
  );
  const controlled = active !== undefined;
  const currentActive = controlled ? active : internalActive;
  const activeTab = tabs.includes(currentActive) ? currentActive : fallbackTab;
  const tabsListRef = React.useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [pillStyle, setPillStyle] = React.useState<{
    left: number;
    width: number;
  }>({
    left: 0,
    width: 0,
  });

  React.useEffect(() => {
    if (!controlled && activeTab !== internalActive) {
      setInternalActive(activeTab);
    }
  }, [controlled, activeTab, internalActive]);

  const setActive = React.useCallback(
    (value: string) => {
      if (!controlled) {
        setInternalActive(value);
      }
      onActiveChange?.(value);
    },
    [controlled, onActiveChange],
  );

  const updatePillPosition = React.useCallback(() => {
    const tabsListEl = tabsListRef.current;
    if (!tabsListEl) return;
    const activeEl = tabsListEl.querySelector<HTMLElement>(
      '[role="tab"][data-state="active"]',
    );
    if (!activeEl) return;

    setPillStyle({
      left: activeEl.offsetLeft,
      width: activeEl.offsetWidth,
    });
  }, []);

  React.useEffect(() => {
    updatePillPosition();
  }, [updatePillPosition, tabs, size, activeTab]);

  React.useEffect(() => {
    window.addEventListener("resize", updatePillPosition);
    return () => window.removeEventListener("resize", updatePillPosition);
  }, [updatePillPosition]);

  React.useEffect(() => {
    const tabsListEl = tabsListRef.current;
    if (!tabsListEl) return;
    tabsListEl.addEventListener("scroll", updatePillPosition, {
      passive: true,
    });
    return () => tabsListEl.removeEventListener("scroll", updatePillPosition);
  }, [updatePillPosition]);

  React.useEffect(() => {
    const tabsListEl = tabsListRef.current;
    if (!tabsListEl) return;
    const activeEl = tabsListEl.querySelector<HTMLElement>(
      '[role="tab"][data-state="active"]',
    );
    if (!activeEl) return;

    scrollActiveTabIntoListView(
      tabsListEl,
      activeEl,
      reduceMotion ? "auto" : "smooth",
    );
  }, [activeTab, reduceMotion, tabs]);

  const glowByIntensity = {
    subtle: {
      haloOpacity: 0.2,
      haloBlur: 14,
      ringOpacity: 0.12,
      ringBlur: 3,
    },
    default: {
      haloOpacity: 0.28,
      haloBlur: 20,
      ringOpacity: 0.16,
      ringBlur: 4,
    },
    strong: {
      haloOpacity: 0.38,
      haloBlur: 28,
      ringOpacity: 0.24,
      ringBlur: 5,
    },
  } as const;
  const glowStyle = glowByIntensity[glowIntensity];

  if (!tabs.length) {
    return null;
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActive}
      className={cn("min-w-0", className)}
    >
      <div className="flex w-full justify-center">
        <TabsList
          ref={tabsListRef}
          className={cn(
            "relative isolate",
            morphTabsVariants({ size }),
            "h-auto w-fit max-w-full flex-nowrap justify-start gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain",
            "[scrollbar-width:thin]",
            "[&::-webkit-scrollbar]:h-1.5",
            "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/80",
          )}
        >
          <motion.div
            aria-hidden
            animate={{ left: pillStyle.left, width: pillStyle.width }}
            transition={{ type: "spring", stiffness: 450, damping: 34 }}
            className="absolute bottom-2 top-2 z-0 rounded-lg border border-border/70 bg-background shadow-sm"
          >
            {glow && (
              <>
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-lg"
                  style={{
                    boxShadow: `0 0 ${glowStyle.haloBlur}px ${
                      glowStyle.haloBlur / 2
                    }px ${glowColor}`,
                  }}
                  animate={
                    reduceMotion
                      ? { opacity: glowStyle.haloOpacity }
                      : {
                          opacity: [
                            glowStyle.haloOpacity * 0.75,
                            glowStyle.haloOpacity,
                            glowStyle.haloOpacity * 0.75,
                          ],
                        }
                  }
                  transition={{
                    duration: 1.8,
                    ease: "easeInOut",
                    repeat: reduceMotion ? 0 : Infinity,
                  }}
                />
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-lg"
                  style={{
                    boxShadow: `inset 0 0 ${glowStyle.ringBlur}px ${glowColor}`,
                  }}
                  animate={{ opacity: glowStyle.ringOpacity }}
                  transition={{ duration: reduceMotion ? 0 : 0.2 }}
                />
              </>
            )}
          </motion.div>

          {tabs.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <TabsTrigger
                key={tab}
                value={tab}
                className={cn(
                  "relative z-10 cursor-pointer flex-none shrink-0 border-0 bg-transparent shadow-none ring-0 after:hidden focus-visible:ring-2 focus-visible:ring-ring/60",
                  morphTabsTriggerVariants({ size, active: isActive }),
                  "data-[state=active]:border-0 data-[state=active]:bg-transparent! data-[state=active]:shadow-none! dark:data-[state=active]:bg-transparent! dark:data-[state=active]:shadow-none!",
                )}
              >
                <span>{tab}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {panels &&
        tabs.map((tab) => (
          <TabsContent
            key={tab}
            value={tab}
            className="mt-3 data-[state=inactive]:hidden"
          >
            {tab === activeTab && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className={cn(
                  "rounded-xl border border-border/70 bg-card p-4 text-sm",
                  panelClassName,
                )}
              >
                {panels[tab]}
              </motion.div>
            )}
          </TabsContent>
        ))}
    </Tabs>
  );
}

export { morphTabsVariants, morphTabsTriggerVariants };
