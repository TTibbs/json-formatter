"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { CodeBlock } from "@/components/ui/code-block";
import { Reveal } from "@/components/ui/reveal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { DEMO_OUTPUT_JSON } from "../landing-data";

const LaptopShowcase = dynamic(
  () =>
    import("@/components/mockups/animated-laptop").then(
      (m) => m.LaptopShowcase,
    ),
  {
    loading: () => (
      <div className="mx-auto h-64 w-full max-w-lg animate-pulse rounded-xl bg-muted/30" />
    ),
    ssr: false,
  },
);

export function FinalCtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 md:py-32">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal animation="fade-right">
          <LaptopShowcase className="max-w-lg">
            <CodeBlock
              code={DEMO_OUTPUT_JSON}
              language="json"
              showCopyButton={false}
              className="h-full text-[10px]"
            />
          </LaptopShowcase>
        </Reveal>

        <div className="flex flex-col gap-6">
          <Reveal animation="fade-up">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Stop fighting payloads.
              <br />
              Start shipping integrations.
            </h2>
          </Reveal>

          <Reveal animation="fade-up" delay={0.1}>
            <p className="text-lg text-muted-foreground">
              Paste JSON. Describe the change. Get the shape you need.
            </p>
          </Reveal>

          <Reveal animation="fade-up" delay={0.2}>
            <Link href="/app" className="inline-block w-fit">
              <ShimmerButton
                title="Start Transforming JSON"
                className="max-w-none w-auto min-w-[240px] px-6"
              />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
