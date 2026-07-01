"use client";

import { Reveal } from "@/components/ui/reveal";

export function UseCasesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <Reveal animation="fade-up">
        <div className="border-y border-border/60 py-10 md:grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-end md:gap-12 md:py-12">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Useful wherever JSON changes hands.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground md:mt-0">
            APIs, webhooks, AI outputs, frontend models and legacy systems.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
