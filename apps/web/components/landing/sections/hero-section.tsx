"use client";

import Link from "next/link";
import { MatrixBackground } from "@/components/ui/matrix-background";
import { Reveal } from "@/components/ui/reveal";
import { RotatingText } from "@/components/ui/rotating-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { ANCHORS, ROTATING_PHRASES } from "../landing-data";

export function HeroSection() {
  return (
    <MatrixBackground
      className="relative min-h-[500px] w-full overflow-hidden rounded-xl border border-border"
      opacity="subtle"
      density="medium"
    >
      <section className="relative mx-auto flex max-w-6xl flex-col items-center justify-center px-4 pb-24 pt-32 text-center md:pt-40">
        <Reveal animation="fade-up" delay={0}>
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-emerald-400/90">
            The fastest way to reshape data between systems
          </p>
        </Reveal>

        <Reveal animation="fade-up" delay={0.1}>
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Stop wasting tokens transforming JSON.
          </h1>
          <p className="mt-4 font-heading text-2xl font-semibold text-foreground/90 md:text-3xl">
            <RotatingText
              items={ROTATING_PHRASES}
              variant="highlight"
              intervalMs={2800}
              className="text-emerald-400"
            />
          </p>
        </Reveal>

        <Reveal animation="fade-up" delay={0.2}>
          <p className="mt-6 max-w-2xl text-center text-lg text-muted-foreground md:text-xl mx-auto">
            Transform, restructure and remap JSON without writing throwaway
            scripts or repeatedly asking AI to reshape data.
          </p>
        </Reveal>

        <Reveal animation="fade-up" delay={0.3}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/app">
              <ShimmerButton
                title="Start Transforming"
                className="max-w-none w-auto min-w-[200px] px-6"
              />
            </Link>
            <a
              href={`#${ANCHORS.examples}`}
              className="rounded-lg border border-border/60 bg-card/50 px-6 py-2.5 text-sm font-medium text-foreground/90 backdrop-blur-sm transition-colors hover:bg-card hover:text-foreground"
            >
              View Examples
            </a>
          </div>
        </Reveal>
      </section>
    </MatrixBackground>
  );
}
