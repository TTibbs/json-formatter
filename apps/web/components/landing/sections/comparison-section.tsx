"use client";

import { X, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { COMPARISON_LEFT, COMPARISON_RIGHT } from "../landing-data";

export function ComparisonSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 md:py-32">
      <Reveal animation="fade-up">
        <h2 className="mb-12 text-center font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Why not just ask AI every time?
        </h2>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-2">
        <Reveal animation="fade-right">
          <Card className="h-full border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive/90">
                {COMPARISON_LEFT.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3" role="list">
                {COMPARISON_LEFT.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                  >
                    <X
                      className="mt-0.5 size-4 shrink-0 text-destructive/70"
                      aria-hidden
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal animation="fade-left" delay={0.1}>
          <Card className="h-full border-emerald-500/25 bg-emerald-500/5">
            <CardHeader>
              <CardTitle className="text-emerald-400">
                {COMPARISON_RIGHT.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3" role="list">
                {COMPARISON_RIGHT.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-emerald-400"
                      aria-hidden
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
