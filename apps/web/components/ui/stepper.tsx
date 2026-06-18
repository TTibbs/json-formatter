"use client";

import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  type Placement,
} from "@floating-ui/react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TourSide = "top" | "bottom" | "left" | "right" | "auto";

export type StepItemProps = {
  title: string;
  description?: string;
  optional?: boolean;
  disabled?: boolean;
  side?: TourSide;
  children: ReactNode;
};

export type StepperProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultStep?: number;
  currentStep?: number;
  onStepChange?: (step: number) => void;
  showProgress?: boolean;
  showControls?: boolean;
  showSkip?: boolean;
  autoScroll?: boolean;
  onFinish?: () => void;
  onSkip?: () => void;
  finishLabel?: string;
  skipLabel?: string;
  /** Accessible name for the tour dialog. */
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
  /** @future persist completed tour state in storage */
  persistKey?: string;
  /** @future block | allow interaction with highlighted target */
  interactionMode?: "block" | "allow";
  /** @future auto-advance trigger */
  advanceOn?: "click" | "none";
  /** @future allow clicking steps to jump */
  allowStepClick?: boolean;
};

type StepMeta = {
  disabled?: boolean;
  optional?: boolean;
};

type RegisteredStep = {
  id: string;
  ref: RefObject<HTMLElement | null>;
  title: string;
  description?: string;
  optional?: boolean;
  disabled?: boolean;
  side: TourSide;
};

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type StepperContextValue = {
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  setStep: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  registerStep: (step: Omit<RegisteredStep, "id">) => string;
  unregisterStep: (id: string) => void;
  getStepIndex: (id: string) => number;
};

type TourLayerContextValue = {
  currentStep: number;
  totalSteps: number;
  activeStep: RegisteredStep | null;
  targetRect: TargetRect | null;
  showProgress: boolean;
  showControls: boolean;
  showSkip: boolean;
  finishLabel: string;
  skipLabel: string;
  ariaLabel: string;
  stepMeta: StepMeta[];
  goNext: () => void;
  goPrev: () => void;
  closeTour: () => void;
  onFinish?: () => void;
  onSkip?: () => void;
};

const TOUR_Z_INDEX = 100;
const SPOTLIGHT_PADDING = 8;
const SPOTLIGHT_RADIUS = 8;

const StepperContext = createContext<StepperContextValue | null>(null);

function useStepperContext(): StepperContextValue {
  const ctx = useContext(StepperContext);
  if (!ctx) {
    throw new Error("StepItem must be used within <Stepper>");
  }
  return ctx;
}

function getNextEnabledStep(stepMeta: StepMeta[], from: number): number | null {
  for (let i = from + 1; i < stepMeta.length; i++) {
    if (!stepMeta[i]?.disabled) return i;
  }
  return null;
}

function getPrevEnabledStep(stepMeta: StepMeta[], from: number): number | null {
  for (let i = from - 1; i >= 0; i--) {
    if (!stepMeta[i]?.disabled) return i;
  }
  return null;
}

function getFirstEnabledStep(stepMeta: StepMeta[]): number {
  for (let i = 0; i < stepMeta.length; i++) {
    if (!stepMeta[i]?.disabled) return i;
  }
  return 0;
}

function getLastEnabledStep(stepMeta: StepMeta[]): number {
  for (let i = stepMeta.length - 1; i >= 0; i--) {
    if (!stepMeta[i]?.disabled) return i;
  }
  return Math.max(0, stepMeta.length - 1);
}

function isStepEnabled(stepMeta: StepMeta[], index: number): boolean {
  return !stepMeta[index]?.disabled;
}

function useStepperState({
  currentStep,
  defaultStep = 0,
  onStepChange,
  stepMeta,
}: {
  currentStep?: number;
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  stepMeta: StepMeta[];
}) {
  const controlled = currentStep !== undefined;
  const [internalStep, setInternalStep] = useState(defaultStep);

  const rawStep = controlled ? currentStep : internalStep;

  const resolvedStep = useMemo(() => {
    if (stepMeta.length === 0) return 0;
    const clamped = Math.min(Math.max(0, rawStep), stepMeta.length - 1);
    if (isStepEnabled(stepMeta, clamped)) return clamped;
    const next = getNextEnabledStep(stepMeta, clamped - 1);
    if (next !== null) return next;
    return getFirstEnabledStep(stepMeta);
  }, [rawStep, stepMeta]);

  const setStep = useCallback(
    (next: number) => {
      if (next < 0 || next >= stepMeta.length) return;
      if (!isStepEnabled(stepMeta, next)) return;
      if (!controlled) {
        setInternalStep(next);
      }
      onStepChange?.(next);
    },
    [controlled, onStepChange, stepMeta],
  );

  const goNext = useCallback(() => {
    const next = getNextEnabledStep(stepMeta, resolvedStep);
    if (next !== null) setStep(next);
  }, [resolvedStep, setStep, stepMeta]);

  const goPrev = useCallback(() => {
    const prev = getPrevEnabledStep(stepMeta, resolvedStep);
    if (prev !== null) setStep(prev);
  }, [resolvedStep, setStep, stepMeta]);

  return { currentStep: resolvedStep, setStep, goNext, goPrev };
}

function useTourOpenState({
  open,
  defaultOpen = false,
  onOpenChange,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const controlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const isOpen = controlled ? open : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );

  return { isOpen, setOpen };
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as RefObject<T | null>).current = node;
      }
    }
  };
}

function measureTargetRect(el: HTMLElement | null): TargetRect | null {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };
}

function resolvePlacement(side: TourSide): Placement {
  if (side === "auto") return "bottom";
  return side;
}

let stepIdCounter = 0;
function nextStepId() {
  stepIdCounter += 1;
  return `step-${stepIdCounter}`;
}

function useTargetRect(
  targetRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const [rect, setRect] = useState<TargetRect | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      setRect(null);
      return;
    }

    const el = targetRef.current;
    if (!el) {
      setRect(null);
      return;
    }

    const update = () => setRect(measureTargetRect(el));

    update();
    const cleanup = autoUpdate(el, document.body, update, {
      animationFrame: true,
    });

    return cleanup;
  }, [targetRef, enabled]);

  return rect;
}

export const StepItem = forwardRef<HTMLElement, StepItemProps>(
  function StepItem(
    { title, description, optional, disabled, side = "auto", children },
    ref,
  ) {
    const { registerStep, unregisterStep, isOpen, currentStep, getStepIndex } =
      useStepperContext();

    const localRef = useRef<HTMLElement | null>(null);
    const stepIdRef = useRef<string | null>(null);
    const [stepIndex, setStepIndex] = useState(-1);

    useLayoutEffect(() => {
      const id = registerStep({
        ref: localRef,
        title,
        description,
        optional,
        disabled,
        side,
      });
      stepIdRef.current = id;

      return () => {
        unregisterStep(id);
        stepIdRef.current = null;
      };
    }, [
      title,
      description,
      optional,
      disabled,
      side,
      registerStep,
      unregisterStep,
    ]);

    useEffect(() => {
      if (stepIdRef.current) {
        setStepIndex(getStepIndex(stepIdRef.current));
      }
    }, [getStepIndex]);

    const isActive = isOpen && stepIndex >= 0 && currentStep === stepIndex;

    useEffect(() => {
      const el = localRef.current;
      if (!el) return;

      if (isActive) {
        el.dataset.tourActive = "true";
        el.style.position = el.style.position || "relative";
        el.style.zIndex = String(TOUR_Z_INDEX + 1);
      } else {
        delete el.dataset.tourActive;
        el.style.zIndex = "";
      }

      return () => {
        delete el.dataset.tourActive;
        el.style.zIndex = "";
      };
    }, [isActive]);

    const setRefs = useCallback(
      (node: HTMLElement | null) => {
        localRef.current = node;
        mergeRefs(ref)(node);
      },
      [ref],
    );

    if (isValidElement(children) && Children.count(children) === 1) {
      const child = children as ReactElement<{ ref?: Ref<HTMLElement> }>;
      return cloneElement(child, {
        ref: mergeRefs(setRefs, child.props.ref),
      });
    }

    return (
      <div ref={setRefs as Ref<HTMLDivElement>} data-step-target>
        {children}
      </div>
    );
  },
);

function TourOverlay({ rect }: { rect: TargetRect | null }) {
  const maskId = `tour-mask-${useId().replace(/:/g, "")}`;

  if (!rect) {
    return (
      <div
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: TOUR_Z_INDEX }}
        aria-hidden
      />
    );
  }

  const { left, top, width, height } = rect;
  const holeX = left;
  const holeY = top;
  const holeW = width;
  const holeH = height;
  const r = SPOTLIGHT_RADIUS;

  return (
    <svg
      className="pointer-events-auto fixed inset-0 h-full w-full"
      style={{ zIndex: TOUR_Z_INDEX }}
      aria-hidden
    >
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect
            x={holeX}
            y={holeY}
            width={holeW}
            height={holeH}
            rx={r}
            ry={r}
            fill="black"
          />
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="rgba(0,0,0,0.55)"
        mask={`url(#${maskId})`}
        className="pointer-events-auto"
      />
    </svg>
  );
}

function TourSpotlight({ rect }: { rect: TargetRect | null }) {
  if (!rect) return null;

  const reduced = prefersReducedMotion();

  return (
    <div
      className={cn(
        "pointer-events-none fixed rounded-lg ring-2 ring-primary",
        "shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_25%,transparent),0_0_24px_color-mix(in_oklch,var(--primary)_20%,transparent)]",
        !reduced && "animate-in fade-in-0 zoom-in-95 duration-200",
      )}
      style={{
        zIndex: TOUR_Z_INDEX + 1,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: SPOTLIGHT_RADIUS,
      }}
      aria-hidden
    />
  );
}

function TourTooltip({
  activeStep,
  targetRect,
  tour,
}: {
  activeStep: RegisteredStep;
  targetRect: TargetRect;
  tour: TourLayerContextValue;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const virtualRef = useMemo(
    () => ({
      getBoundingClientRect: () => ({
        x: targetRect.left,
        y: targetRect.top,
        top: targetRect.top,
        left: targetRect.left,
        bottom: targetRect.top + targetRect.height,
        right: targetRect.left + targetRect.width,
        width: targetRect.width,
        height: targetRect.height,
      }),
    }),
    [targetRect],
  );

  const { refs, floatingStyles, placement } = useFloating({
    placement: resolvePlacement(activeStep.side),
    middleware: [offset(14), flip({ padding: 12 }), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
    elements: { reference: virtualRef },
  });

  const firstEnabled = getFirstEnabledStep(tour.stepMeta);
  const lastEnabled = getLastEnabledStep(tour.stepMeta);
  const isFirst = tour.currentStep === firstEnabled;
  const isLast = tour.currentStep === lastEnabled;

  const handleSkip = () => {
    tour.onSkip?.();
    tour.closeTour();
  };

  const handleFinish = () => {
    tour.onFinish?.();
    tour.closeTour();
  };

  useEffect(() => {
    dialogRef.current?.focus();
  }, [tour.currentStep]);

  return (
    <div
      ref={(node) => {
        refs.setFloating(node);
        dialogRef.current = node;
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={activeStep.description ? descriptionId : undefined}
      aria-label={tour.ariaLabel}
      tabIndex={-1}
      className={cn(
        "pointer-events-auto w-[min(calc(100vw-2rem),22rem)] rounded-xl border border-border/80",
        "bg-(--stepper-background,var(--card)) p-4 text-(--stepper-foreground,var(--foreground))",
        "shadow-xl outline-none backdrop-blur-sm",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        placement.startsWith("top") && "slide-in-from-bottom-2",
        placement.startsWith("bottom") && "slide-in-from-top-2",
        placement.startsWith("left") && "slide-in-from-right-2",
        placement.startsWith("right") && "slide-in-from-left-2",
      )}
      style={{ ...floatingStyles, zIndex: TOUR_Z_INDEX + 2 }}
      onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") {
          event.preventDefault();
          tour.closeTour();
        }
      }}
    >
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={titleId} className="text-sm font-semibold leading-tight">
            {activeStep.title}
          </h3>
          {activeStep.optional ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Optional
            </span>
          ) : null}
        </div>
        {activeStep.description ? (
          <p
            id={descriptionId}
            className="text-xs leading-relaxed text-muted-foreground"
          >
            {activeStep.description}
          </p>
        ) : null}
      </div>

      {tour.showProgress ? (
        <p
          className="mt-3 text-[11px] font-medium tabular-nums text-muted-foreground"
          aria-live="polite"
          role="status"
        >
          Step {tour.currentStep + 1} of {tour.totalSteps}
        </p>
      ) : null}

      {tour.showControls ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex shrink-0">
            {tour.showSkip ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSkip}
              >
                {tour.skipLabel}
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={tour.goPrev}
              disabled={isFirst}
            >
              Previous
            </Button>

            {isLast ? (
              <Button type="button" size="sm" onClick={handleFinish}>
                {tour.finishLabel}
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={tour.goNext}>
                Next
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TourLayer({
  steps,
  tour,
  autoScroll,
}: {
  steps: RegisteredStep[];
  tour: TourLayerContextValue;
  autoScroll: boolean;
}) {
  const activeStep = steps[tour.currentStep] ?? null;
  const targetRef = activeStep?.ref ?? { current: null };
  const targetRect = useTargetRect(targetRef, Boolean(activeStep));

  useEffect(() => {
    if (!autoScroll || !activeStep?.ref.current) return;
    activeStep.ref.current.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "center",
    });
  }, [activeStep, autoScroll, tour.currentStep]);

  useEffect(() => {
    if (!tour) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          tour.closeTour();
          break;
        case "ArrowRight":
          event.preventDefault();
          tour.goNext();
          break;
        case "ArrowLeft":
          event.preventDefault();
          tour.goPrev();
          break;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [tour]);

  if (!activeStep || !targetRect) return null;

  return (
    <>
      <TourOverlay rect={targetRect} />
      <TourSpotlight rect={targetRect} />
      <TourTooltip
        activeStep={activeStep}
        targetRect={targetRect}
        tour={tour}
      />
    </>
  );
}

export const Stepper = forwardRef<HTMLDivElement, StepperProps>(
  function Stepper(
    {
      open,
      defaultOpen = false,
      onOpenChange,
      defaultStep = 0,
      currentStep,
      onStepChange,
      showProgress = true,
      showControls = true,
      showSkip = false,
      autoScroll = true,
      onFinish,
      onSkip,
      finishLabel = "Finish",
      skipLabel = "Skip",
      ariaLabel = "Guided tour",
      className,
      children,
    },
    ref,
  ) {
    const [mounted, setMounted] = useState(false);
    const [steps, setSteps] = useState<RegisteredStep[]>([]);

    const { isOpen, setOpen } = useTourOpenState({
      open,
      defaultOpen,
      onOpenChange,
    });

    const registerStep = useCallback(
      (step: Omit<RegisteredStep, "id">): string => {
        const id = nextStepId();
        setSteps((prev) => [...prev, { ...step, id }]);
        return id;
      },
      [],
    );

    const unregisterStep = useCallback((id: string) => {
      setSteps((prev) => prev.filter((s) => s.id !== id));
    }, []);

    const getStepIndex = useCallback(
      (id: string) => steps.findIndex((s) => s.id === id),
      [steps],
    );

    const stepMeta = useMemo<StepMeta[]>(
      () =>
        steps.map((s) => ({
          disabled: s.disabled,
          optional: s.optional,
        })),
      [steps],
    );

    const {
      currentStep: activeStep,
      setStep,
      goNext,
      goPrev,
    } = useStepperState({
      currentStep,
      defaultStep,
      onStepChange,
      stepMeta,
    });

    const closeTour = useCallback(() => {
      setOpen(false);
    }, [setOpen]);

    const contextValue = useMemo<StepperContextValue>(
      () => ({
        isOpen,
        currentStep: activeStep,
        totalSteps: steps.length,
        setStep,
        goNext,
        goPrev,
        registerStep,
        unregisterStep,
        getStepIndex,
      }),
      [
        isOpen,
        activeStep,
        steps.length,
        setStep,
        goNext,
        goPrev,
        registerStep,
        unregisterStep,
        getStepIndex,
      ],
    );

    const tourLayerValue = useMemo<TourLayerContextValue>(
      () => ({
        currentStep: activeStep,
        totalSteps: steps.length,
        activeStep: steps[activeStep] ?? null,
        targetRect: null,
        showProgress,
        showControls,
        showSkip,
        finishLabel,
        skipLabel,
        ariaLabel,
        stepMeta,
        goNext,
        goPrev,
        closeTour,
        onFinish,
        onSkip,
      }),
      [
        activeStep,
        steps,
        showProgress,
        showControls,
        showSkip,
        finishLabel,
        skipLabel,
        ariaLabel,
        stepMeta,
        goNext,
        goPrev,
        closeTour,
        onFinish,
        onSkip,
      ],
    );

    useEffect(() => {
      setMounted(true);
    }, []);

    return (
      <StepperContext.Provider value={contextValue}>
        <div ref={ref} className={cn(className)}>
          {children}
        </div>
        {mounted && isOpen
          ? createPortal(
              <TourLayer
                steps={steps}
                tour={tourLayerValue}
                autoScroll={autoScroll}
              />,
              document.body,
            )
          : null}
      </StepperContext.Provider>
    );
  },
);
