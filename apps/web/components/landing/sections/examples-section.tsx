"use client";

import { MorphTabs } from "@/components/ui/morph-tabs";
import { CodeBlock } from "@/components/ui/code-block";
import { Reveal } from "@/components/ui/reveal";
import { TRANSFORMATION_EXAMPLES } from "../landing-data";

function ExamplePanel({ exampleId }: { exampleId: string }) {
  const example = TRANSFORMATION_EXAMPLES.find((e) => e.id === exampleId);
  if (!example) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
  const tabLabels = TRANSFORMATION_EXAMPLES.map((e) => e.label);
  const panels = Object.fromEntries(
    TRANSFORMATION_EXAMPLES.map((example) => [
      example.label,
      <ExamplePanel key={example.id} exampleId={example.id} />,
    ]),
  );

  return (
    <section
      id="examples"
      className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 md:py-32"
    >
      <Reveal animation="fade-up">
        <div className="mb-10 max-w-3xl">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Real transforms, not toy examples.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Flatten nesting, rename fields, filter noise, and reshape payloads
            you actually see in production.
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
          panelClassName="mt-6 rounded-xl border border-border/60 bg-card/40 p-4 md:p-6"
        />
      </Reveal>
    </section>
  );
}
