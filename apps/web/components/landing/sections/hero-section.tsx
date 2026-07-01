"use client";

import Link from "next/link";
import { MatrixBackground } from "@/components/ui/matrix-background";
import { Reveal } from "@/components/ui/reveal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { ANCHORS } from "../landing-data";

export function HeroSection() {
  return (
    <MatrixBackground
      className="relative min-h-[540px] w-full overflow-hidden border-b border-border/60"
      opacity="subtle"
      density="medium"
    >
      <section className="relative mx-auto flex max-w-6xl flex-col items-start justify-center px-4 py-24 text-left md:min-h-[620px] md:py-32">
        <Reveal animation="fade-up" delay={0.1}>
          <h1 className="max-w-5xl font-heading text-4xl font-bold leading-[1.08] tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Reshape JSON without writing another throwaway script.
          </h1>
        </Reveal>

        <Reveal animation="fade-up" delay={0.2}>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Paste a payload, describe the structure you need, and get reusable
            JSON transformations in seconds. Free to use, from Tibbs Tech.
          </p>
        </Reveal>

        <Reveal animation="fade-up" delay={0.3}>
          <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link href="/app">
              <ShimmerButton
                title="Open JSON Transformer"
                className="max-w-none w-auto min-w-[200px] px-6"
              />
            </Link>
            <a
              href={`#${ANCHORS.examples}`}
              className="px-2 py-2.5 text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
            >
              See an example <span aria-hidden>→</span>
            </a>
          </div>
        </Reveal>

        <Reveal animation="fade-up" delay={0.4}>
          <p className="mt-5 text-sm text-muted-foreground">
            A{" "}
            <a
              href="https://tibbstech.co.uk"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 transition-colors hover:text-emerald-300"
            >
              Tibbs Tech
            </a>{" "}
            tool
          </p>
        </Reveal>
      </section>
    </MatrixBackground>
  );
}
