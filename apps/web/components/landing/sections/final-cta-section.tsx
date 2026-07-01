"use client";

import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { ShimmerButton } from "@/components/ui/shimmer-button";

export function FinalCtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <div className="flex flex-col items-center border-t border-border/60 pt-16 text-center md:pt-24">
        <div className="flex max-w-3xl flex-col items-center gap-6">
          <Reveal animation="fade-up">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Your payload in. The shape you need out.
            </h2>
          </Reveal>

          <Reveal animation="fade-up" delay={0.1}>
            <p className="text-lg text-muted-foreground">
              JSON Transformer is free to use — a small tool from Tibbs Tech.
            </p>
          </Reveal>

          <Reveal animation="fade-up" delay={0.2}>
            <Link href="/app" className="inline-block w-fit">
              <ShimmerButton
                title="Open JSON Transformer"
                className="max-w-none w-auto min-w-[220px] px-6"
              />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
