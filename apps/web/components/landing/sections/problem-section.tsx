"use client";

import { PixelRevealCard } from "@/components/ui/pixel-reveal-card";
import { Reveal } from "@/components/ui/reveal";
import { PROBLEM_CARDS, problemCardImage } from "../landing-data";

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 md:px-20 py-12 md:py-24">
      <Reveal animation="fade-up">
        <div className="mb-12 max-w-3xl">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            The problem isn&apos;t JSON.
            <br />
            It&apos;s everything around it.
          </h2>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
        {PROBLEM_CARDS.map((card, index) => (
          <Reveal key={card.statement} animation="fade-up" delay={index * 0.08}>
            <PixelRevealCard
              image={problemCardImage(card.hue)}
              name={card.statement}
              role={card.tag}
              className="mx-auto w-full max-w-none"
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
