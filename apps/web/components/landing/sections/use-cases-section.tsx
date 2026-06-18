"use client";

import { Reveal } from "@/components/ui/reveal";
import { ElectricBorderCard } from "@/components/ui/electric-border-card";
import { SpotlightGrid } from "@/components/ui/spotlight-grid";
import { USE_CASES } from "../landing-data";

export function UseCasesSection() {
  const spotlightItems = USE_CASES.slice(0, 3).map((useCase) => ({
    title: useCase.title,
    description: useCase.description,
  }));

  const electricItems = USE_CASES.slice(3);

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 md:py-32">
      <Reveal animation="fade-up">
        <div className="mb-12 max-w-3xl">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Built for data that refuses to agree with itself.
          </h2>
        </div>
      </Reveal>

      <Reveal animation="fade-up" delay={0.1}>
        <SpotlightGrid items={spotlightItems} columns={3} variant="glow" />
      </Reveal>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {electricItems.map((useCase, index) => (
          <Reveal key={useCase.title} animation="fade-up" delay={0.15 + index * 0.06}>
            <ElectricBorderCard
              className="h-full"
              contentClassName="flex h-full flex-col gap-2 p-5"
              arcColor="#10b981"
              accentColor="#06b6d4"
            >
              <h3 className="font-heading text-base font-semibold text-foreground">
                {useCase.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {useCase.description}
              </p>
            </ElectricBorderCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
