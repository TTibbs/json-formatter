"use client";

import dynamic from "next/dynamic";
import { CodeBlock } from "@/components/ui/code-block";
import { Reveal } from "@/components/ui/reveal";
import { JsonCompareSlider } from "../json-compare-slider";
import { DEMO_INPUT_JSON, DEMO_OUTPUT_JSON } from "../landing-data";

const BrowserMockup = dynamic(
  () =>
    import("@/components/mockups/browser-mockup").then((m) => m.BrowserMockup),
  {
    loading: () => (
      <div className="h-[480px] animate-pulse rounded-2xl border border-border/60 bg-muted/30" />
    ),
    ssr: false,
  },
);

const DiffViewer = dynamic(
  () =>
    import("@/components/diff-viewer/diff-viewer").then((m) => m.DiffViewer),
  {
    loading: () => (
      <div className="h-48 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
    ),
    ssr: false,
  },
);

export function ProductDemoSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 md:py-32">
      <Reveal animation="fade-up">
        <div className="mb-12 max-w-3xl">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Describe the outcome.
            <br />
            Preview the result instantly.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Transform nested, inconsistent or messy payloads into exactly the
            structure you need.
          </p>
        </div>
      </Reveal>

      <Reveal animation="fade-up" delay={0.15}>
        <BrowserMockup
          url="json-transformer.app"
          variant="chrome"
          className="w-full"
          viewportClassName="bg-background"
        >
          <div className="flex flex-col gap-4 p-4">
            <JsonCompareSlider
              before={
                <CodeBlock
                  code={DEMO_INPUT_JSON}
                  showCopyButton={false}
                  language="json"
                  showLineNumbers
                  className="h-full rounded-none border-0"
                />
              }
              after={
                <CodeBlock
                  code={DEMO_OUTPUT_JSON}
                  showCopyButton={false}
                  language="json"
                  showLineNumbers
                  className="h-full rounded-none border-0"
                />
              }
            />
            <DiffViewer
              original={DEMO_INPUT_JSON}
              updated={DEMO_OUTPUT_JSON}
              variant="elevated"
              className="text-xs"
            />
          </div>
        </BrowserMockup>
      </Reveal>
    </section>
  );
}
