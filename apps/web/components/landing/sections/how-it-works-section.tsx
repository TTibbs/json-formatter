"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { FocusModeOverlay } from "@/components/ui/focus-mode-overlay";
import { Reveal } from "@/components/ui/reveal";
import {
  HOW_IT_WORKS_STEPS,
  LANDING_WORKFLOW_EDGES,
  LANDING_WORKFLOW_NODES,
  type HowItWorksPreview,
} from "../landing-data";

const WorkflowCanvas = dynamic(
  () => import("@/components/workflow-canvas").then((m) => m.WorkflowCanvas),
  {
    loading: () => (
      <div className="h-80 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
    ),
    ssr: false,
  },
);

function HowItWorksPreview({ preview }: { preview: HowItWorksPreview }) {
  if (preview.type === "workflow") {
    return (
      <WorkflowCanvas
        nodes={LANDING_WORKFLOW_NODES}
        edges={LANDING_WORKFLOW_EDGES}
        editable={false}
        height={300}
        controls={false}
        minimap={false}
        background
        panOnDrag={false}
        className="rounded-xl border border-border/60"
      />
    );
  }

  return (
    <CodeBlock
      code={preview.code}
      language={preview.language ?? "json"}
      showCopyButton={false}
      showLineNumbers
    />
  );
}

export function HowItWorksSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [tourOpen, setTourOpen] = useState(false);
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tourTargetRef = useRef<HTMLButtonElement | null>(null);

  const activeStep = HOW_IT_WORKS_STEPS[activeIndex];
  const isFirstStep = activeIndex === 0;
  const isLastStep = activeIndex === HOW_IT_WORKS_STEPS.length - 1;

  tourTargetRef.current = stepRefs.current[activeIndex] ?? null;

  useEffect(() => {
    if (!tourOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((index) =>
          Math.min(index + 1, HOW_IT_WORKS_STEPS.length - 1),
        );
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tourOpen]);

  function openTour() {
    setActiveIndex(0);
    setTourOpen(true);
  }

  function closeTour() {
    setTourOpen(false);
  }

  function goToStep(index: number) {
    setActiveIndex(Math.max(0, Math.min(index, HOW_IT_WORKS_STEPS.length - 1)));
  }

  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 md:py-32"
    >
      <Reveal animation="fade-up">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              From payload to production in minutes.
            </h2>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={openTour}>
            Walk through
          </Button>
        </div>
      </Reveal>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <ol
          className="flex flex-col gap-3"
          role="tablist"
          aria-label="Workflow steps"
        >
          {HOW_IT_WORKS_STEPS.map((step, index) => {
            const isActive = activeIndex === index;
            return (
              <li key={step.title}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  ref={(node) => {
                    stepRefs.current[index] = node;
                  }}
                  onClick={() => goToStep(index)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    isActive
                      ? "border-border/60 bg-muted/30"
                      : "border-transparent hover:border-border/40 hover:bg-muted/20",
                  )}
                >
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    Step {index + 1}
                  </span>
                  <h3 className="mt-0.5 font-medium text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </button>
              </li>
            );
          })}
        </ol>

        <Reveal animation="fade-up" delay={0.1}>
          <HowItWorksPreview preview={activeStep.preview} />
        </Reveal>
      </div>

      {tourOpen && activeStep ? (
        <FocusModeOverlay
          key={activeIndex}
          target={tourTargetRef}
          open={tourOpen}
          onOpenChange={setTourOpen}
          title={activeStep.title}
          description={activeStep.description}
          placement="auto"
          scrollIntoView
          lockScroll={false}
        >
          <p
            className="text-[11px] font-medium tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            Step {activeIndex + 1} of {HOW_IT_WORKS_STEPS.length}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={closeTour}>
              Skip
            </Button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isFirstStep}
                onClick={() => goToStep(activeIndex - 1)}
              >
                Previous
              </Button>
              {isLastStep ? (
                <Button type="button" size="sm" onClick={closeTour}>
                  Finish
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => goToStep(activeIndex + 1)}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </FocusModeOverlay>
      ) : null}
    </section>
  );
}
