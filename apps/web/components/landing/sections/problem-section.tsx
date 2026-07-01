"use client";

import { Reveal } from "@/components/ui/reveal";
import { DATA_MISMATCHES } from "../landing-data";

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <Reveal animation="fade-up">
        <div className="mb-8 max-w-3xl">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            The awkward bit between one system and another.
          </h2>
        </div>
      </Reveal>

      <div className="divide-y divide-border/60 border-y border-border/60">
        {DATA_MISMATCHES.map((item, index) => (
          <Reveal key={item.source} animation="fade-up" delay={index * 0.06}>
            <div className="group grid gap-3 px-1 py-5 transition-colors hover:bg-emerald-500/[0.035] md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:px-4">
              <p className="font-heading text-base font-semibold text-foreground md:text-lg">
                {item.source} <span className="mx-1 text-emerald-400">→</span>{" "}
                {item.target}
              </p>
              <div className="flex min-w-0 flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground md:justify-end md:text-sm">
                <code className="rounded-md bg-muted/50 px-2.5 py-1.5">{item.before}</code>
                <span className="text-emerald-400" aria-hidden>→</span>
                <code className="rounded-md bg-muted/50 px-2.5 py-1.5 transition-colors group-hover:text-foreground">{item.after}</code>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
