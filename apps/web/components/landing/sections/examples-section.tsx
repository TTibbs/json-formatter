"use client";

import { MorphTabs } from "@/components/ui/morph-tabs";
import { CodeBlock } from "@/components/ui/code-block";
import { Reveal } from "@/components/ui/reveal";
import { TRANSFORMATION_EXAMPLES } from "../landing-data";

function ExamplePanel({ exampleId }: { exampleId: string }) {
  const example = TRANSFORMATION_EXAMPLES.find((e) => e.id === exampleId);
  if (!example) return null;

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Input
        </p>
        <CodeBlock
          code={example.input}
          showCopyButton={false}
          language="json"
          showLineNumbers
          collapsible
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Transform
        </p>
        <CodeBlock
          code={example.transform}
          showCopyButton={false}
          language="json"
          showLineNumbers
          collapsible
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Output
        </p>
        <CodeBlock
          code={example.output}
          showCopyButton={false}
          language="json"
          showLineNumbers
          collapsible
        />
      </div>
    </div>
  );
}

export function ExamplesSection() {
  const featuredExamples = TRANSFORMATION_EXAMPLES.slice(0, 4);
  const tabLabels = featuredExamples.map((e) => e.label);
  const panels = Object.fromEntries(
    featuredExamples.map((example) => [
      example.label,
      <ExamplePanel key={example.id} exampleId={example.id} />,
    ]),
  );

  return (
    <section
      id="examples"
      className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16 md:py-20"
    >
      <Reveal animation="fade-up">
        <div className="mb-8 max-w-3xl">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            A few common transformations.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Inspect the input, reusable transform and predictable output.
          </p>
        </div>
      </Reveal>

      <Reveal animation="fade-up" delay={0.1}>
        <MorphTabs
          tabs={tabLabels}
          defaultActive={tabLabels[0]}
          panels={panels}
          glow={false}
          className="w-full"
          panelClassName="mt-5 rounded-xl border border-border/60 bg-card/30 p-3 md:p-5"
        />
      </Reveal>
    </section>
  );
}
