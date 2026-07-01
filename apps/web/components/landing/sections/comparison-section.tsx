"use client";

import { Reveal } from "@/components/ui/reveal";

export function ComparisonSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <Reveal animation="fade-up">
        <div className="grid border-y border-emerald-500/35 md:grid-cols-2">
          <h2 className="py-9 font-heading text-3xl font-bold tracking-tight text-foreground md:py-12 md:pr-12 md:text-4xl">
            Make the transformation once. Reuse it whenever the payload comes
            back.
          </h2>
          <p className="border-t border-border/60 py-9 text-lg leading-relaxed text-muted-foreground md:border-l md:border-t-0 md:py-12 md:pl-12">
            Unlike a one-off prompt, a saved transform is predictable,
            inspectable and ready for the next run.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
