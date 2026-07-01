import { CodeBlock } from "@/components/ui/code-block";
import { Reveal } from "@/components/ui/reveal";
import { DEMO_DSL_JSON, DEMO_INPUT_JSON, DEMO_OUTPUT_JSON } from "../landing-data";

const PANELS = [
  { label: "Input", code: DEMO_INPUT_JSON },
  { label: "Transform", code: DEMO_DSL_JSON },
  { label: "Output", code: DEMO_OUTPUT_JSON },
] as const;

export function ProductDemoSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <Reveal animation="fade-up">
        <div className="mb-8 max-w-3xl">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            See the transformation. Copy what you need.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Input, transform and output — side by side, without extra chrome or
            a duplicate diff view.
          </p>
        </div>
      </Reveal>

      <Reveal animation="fade-up" delay={0.15}>
        <div className="grid overflow-hidden rounded-xl border border-border/70 bg-card/30 lg:grid-cols-3">
          {PANELS.map((panel) => (
            <div key={panel.label} className="min-w-0 border-border/70 not-last:border-b lg:not-last:border-r lg:not-last:border-b-0">
              <div className="border-b border-border/60 px-4 py-3 text-sm font-medium text-emerald-400">
                {panel.label}
              </div>
              <CodeBlock
                code={panel.code}
                showCopyButton={false}
                language="json"
                showLineNumbers
                className="h-full min-h-56 rounded-none border-0"
              />
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
