"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type {
  BillingCycle,
  PricingCardProps,
  PricingPlan,
  PricingSectionProps,
} from "./types";

/** Fixed locale so SSR and client produce identical currency strings. */
const PRICE_LOCALE = "en-US";

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat(PRICE_LOCALE, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function getDisplayPrice(plan: PricingPlan, billing: BillingCycle): number {
  return billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
}

function getYearlySavingsPercent(plans: PricingPlan[]): number | null {
  const plan = plans.find((p) => p.monthlyPrice > 0);
  if (!plan) return null;
  const monthlyAnnual = plan.monthlyPrice * 12;
  if (monthlyAnnual <= 0) return null;
  const savings = 1 - plan.yearlyPrice / monthlyAnnual;
  if (savings <= 0) return null;
  return Math.round(savings * 100);
}

function getGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1 max-w-md mx-auto";
  if (count === 2) return "grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto";
  if (count === 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  if (count === 4) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
  return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";
}

export function PricingCard({
  plan,
  billing,
  currency,
  highlighted,
  reducedMotion,
  onCtaClick,
  className,
}: PricingCardProps) {
  const price = getDisplayPrice(plan, billing);
  const period = billing === "yearly" ? "/year" : "/month";

  return (
    <motion.div
      layout={!reducedMotion}
      className={cn(
        "relative flex h-full",
        highlighted && "z-10 lg:-mt-1 lg:mb-1",
        className,
      )}
      whileHover={
        reducedMotion
          ? undefined
          : { y: -4, transition: { duration: 0.2 } }
      }
    >
      <Card
        className={cn(
          "flex h-full w-full flex-col border-border/60 bg-card/80 shadow-sm backdrop-blur-sm transition-shadow duration-300",
          highlighted
            ? "border-primary/40 shadow-lg ring-2 ring-primary/20 lg:scale-[1.02]"
            : "hover:shadow-md",
        )}
      >
        {(plan.badge || highlighted) && (
          <motion.div
            layout={false}
            className="absolute -top-3 left-1/2 z-20 -translate-x-1/2"
          >
            <Badge
              variant={highlighted ? "default" : "secondary"}
              className="px-3 shadow-sm"
            >
              {plan.badge ?? "Most Popular"}
            </Badge>
          </motion.div>
        )}

        <CardHeader className="pb-4 pt-8">
          <CardTitle className="text-xl font-semibold tracking-tight">
            {plan.name}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {plan.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-6">
          <div className="flex items-baseline gap-1">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${plan.id}-${billing}-${price}`}
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="text-4xl font-semibold tracking-tight tabular-nums"
              >
                {formatPrice(price, currency)}
              </motion.span>
            </AnimatePresence>
            <span className="text-sm text-muted-foreground">{period}</span>
          </div>

          {plan.features.length > 0 ? (
            <ul className="flex flex-col gap-2.5" role="list">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>

        <CardFooter className="pt-0">
          <Button
            type="button"
            variant={highlighted ? "default" : "outline"}
            className="w-full"
            onClick={() => onCtaClick?.(plan.id, billing)}
          >
            {plan.ctaText}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export function PricingSection({
  plans,
  defaultBilling = "monthly",
  currency = "USD",
  highlightedPlanId,
  onCtaClick,
  className,
}: PricingSectionProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [billing, setBilling] = useState<BillingCycle>(defaultBilling);

  const resolvedHighlightId = useMemo(() => {
    if (highlightedPlanId) return highlightedPlanId;
    return plans.find((p) => p.highlighted)?.id ?? null;
  }, [highlightedPlanId, plans]);

  const savingsPercent = useMemo(() => getYearlySavingsPercent(plans), [plans]);

  if (plans.length === 0) {
    return null;
  }

  const isYearly = billing === "yearly";

  return (
    <section
      className={cn("w-full px-4 py-12 md:py-16", className)}
      aria-label="Pricing"
    >
      <motion.div
        layout={!reducedMotion}
        className="mx-auto flex max-w-6xl flex-col items-center gap-10"
      >
        <motion.div
          layout={false}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            layout={false}
            className="flex items-center gap-3 rounded-full border border-border/60 bg-muted/40 px-4 py-2"
            role="group"
            aria-label="Billing period"
          >
            <Label
              htmlFor="pricing-billing-toggle"
              className={cn(
                "cursor-pointer text-sm font-medium transition-colors",
                !isYearly ? "text-foreground" : "text-muted-foreground",
              )}
            >
              Monthly
            </Label>
            <Switch
              id="pricing-billing-toggle"
              checked={isYearly}
              onCheckedChange={(checked) =>
                setBilling(checked ? "yearly" : "monthly")
              }
              aria-label="Toggle yearly billing"
            />
            <Label
              htmlFor="pricing-billing-toggle"
              className={cn(
                "cursor-pointer text-sm font-medium transition-colors",
                isYearly ? "text-foreground" : "text-muted-foreground",
              )}
            >
              Yearly
            </Label>
            {savingsPercent !== null && isYearly ? (
              <Badge variant="secondary" className="ml-1 shrink-0">
                Save {savingsPercent}%
              </Badge>
            ) : null}
          </motion.div>
          {savingsPercent !== null && !isYearly ? (
            <p className="text-xs text-muted-foreground">
              Switch to yearly and save up to {savingsPercent}%
            </p>
          ) : null}
        </motion.div>

        <motion.div
          layout={!reducedMotion}
          className={cn("grid w-full gap-6 lg:gap-8", getGridClass(plans.length))}
        >
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              billing={billing}
              currency={currency}
              highlighted={plan.id === resolvedHighlightId}
              reducedMotion={reducedMotion}
              onCtaClick={onCtaClick}
            />
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
