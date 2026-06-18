"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { Reveal } from "@/components/ui/reveal";
import { StepItem, Stepper } from "@/components/ui/stepper";
import {
  HOW_IT_WORKS_STEPS,
  LANDING_WORKFLOW_EDGES,
  LANDING_WORKFLOW_NODES,
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

function StepPanel({ step }: { step: number }) {
  if (step === 0) {
    return (
      <CodeBlock
        code={`{\n  "users": [\n    { "name": "Ada", "role": "admin" }\n  ]\n}`}
        showCopyButton={false}
        language="json"
        showLineNumbers
      />
    );
  }

  if (step === 1) {
    return (
      <CodeBlock
        code={`{\n  "teamLead": "users[0].name",\n  "isAdmin": "$users[0].role == 'admin'"\n}`}
        showCopyButton={false}
        language="json"
        showLineNumbers
      />
    );
  }

  if (step === 2) {
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
      code={`{\n  "teamLead": "Ada",\n  "isAdmin": true\n}`}
      language="json"
      showCopyButton={false}
      showLineNumbers
    />
  );
}

export function HowItWorksSection() {
  const [currentStep, setCurrentStep] = useState(0);
  const [tourOpen, setTourOpen] = useState(false);

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTourOpen(true)}
          >
            Walk through
          </Button>
        </div>
      </Reveal>

      <Stepper
        open={tourOpen}
        onOpenChange={setTourOpen}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        showSkip
        onFinish={() => setTourOpen(false)}
        onSkip={() => setTourOpen(false)}
        ariaLabel="How JSON Transformer works"
      >
        <div className="flex flex-col gap-8">
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Workflow steps"
          >
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <button
                key={step.title}
                type="button"
                role="tab"
                aria-selected={currentStep === index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  currentStep === index
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="mr-2 text-xs text-muted-foreground">
                  {index + 1}
                </span>
                {step.title}
              </button>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="flex flex-col gap-3">
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <StepItem
                  key={step.title}
                  title={step.title}
                  description={step.description}
                >
                  <div
                    className={cn(
                      "rounded-lg border border-transparent p-3 transition-colors",
                      currentStep === index && "border-border/60 bg-muted/30",
                    )}
                  >
                    <h3 className="font-medium text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </StepItem>
              ))}
            </div>

            <Reveal animation="fade-up" delay={0.1}>
              <StepPanel step={currentStep} />
            </Reveal>
          </div>
        </div>
      </Stepper>
    </section>
  );
}
