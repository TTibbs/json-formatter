"use client";

import { useMemo } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  InfiniteCardMarquee,
  type CardItem,
} from "@/components/ui/infinite-card-marquee";
import type {
  Testimonial,
  TestimonialCardProps,
  TestimonialRowProps,
} from "./types";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function testimonialsToMarqueeCards(
  testimonials: Testimonial[],
): CardItem[] {
  return testimonials.map((testimonial) => {
    const fallback =
      testimonial.avatarFallback ??
      (testimonial.avatarSrc ? undefined : getInitials(testimonial.name));

    return {
      id: testimonial.id,
      content: (
        <blockquote className="text-sm leading-relaxed text-muted-foreground">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>
      ),
      footer: (
        <div className="flex w-full items-center gap-3 border-t border-border/60 pt-3">
          {(testimonial.avatarSrc || fallback) ? (
            <Avatar size="default">
              {testimonial.avatarSrc ? (
                <AvatarImage src={testimonial.avatarSrc} alt={testimonial.name} />
              ) : null}
              {fallback ? (
                <AvatarFallback>{fallback}</AvatarFallback>
              ) : null}
            </Avatar>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {testimonial.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {testimonial.role}
            </p>
          </div>
        </div>
      ),
      className: "flex h-full flex-col",
      contentClassName: "pt-4",
    };
  });
}

export function TestimonialCard({
  testimonial,
  className,
}: TestimonialCardProps) {
  const { quote, name, role, avatarSrc, avatarFallback } = testimonial;
  const fallback =
    avatarFallback ?? (avatarSrc ? undefined : getInitials(name));

  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <CardContent className="flex flex-1 flex-col justify-between gap-4 pt-6">
        <blockquote className="text-sm leading-relaxed text-muted-foreground md:text-base">
          &ldquo;{quote}&rdquo;
        </blockquote>
      </CardContent>
      <CardFooter className="flex items-center gap-3 border-t border-border/60">
        {(avatarSrc || fallback) ? (
          <Avatar size="default">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt={name} /> : null}
            {fallback ? <AvatarFallback>{fallback}</AvatarFallback> : null}
          </Avatar>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{role}</p>
        </div>
      </CardFooter>
    </Card>
  );
}

export function TestimonialRow({
  testimonials,
  title,
  description,
  rows = 2,
  rowReverse = [false, true],
  speed = "normal",
  pauseOnHover = true,
  cardWidth = 320,
  cardHeight = 280,
  gap = 16,
  rowGap = 12,
  className,
}: TestimonialRowProps) {
  const cards = useMemo(
    () => testimonialsToMarqueeCards(testimonials),
    [testimonials],
  );

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section
      className={cn("w-full px-4 py-12 md:py-16", className)}
      aria-label={title ?? "Testimonials"}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        {title || description ? (
          <div className="flex flex-col gap-2 text-center">
            {title ? (
              <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-muted-foreground">{description}</p>
            ) : null}
          </div>
        ) : null}

        <InfiniteCardMarquee
          cards={cards}
          rows={rows}
          rowReverse={rowReverse}
          speed={speed}
          pauseOnHover={pauseOnHover}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          gap={gap}
          rowGap={rowGap}
        />
      </div>
    </section>
  );
}
