export type BillingCycle = "monthly" | "yearly";

export type PricingPlan = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  ctaText: string;
  badge?: string;
  highlighted?: boolean;
};

export type PricingSectionProps = {
  plans: PricingPlan[];
  defaultBilling?: BillingCycle;
  currency?: string;
  highlightedPlanId?: string;
  onCtaClick?: (planId: string, billing: BillingCycle) => void;
  className?: string;
};

export type PricingCardProps = {
  plan: PricingPlan;
  billing: BillingCycle;
  currency: string;
  highlighted: boolean;
  reducedMotion: boolean;
  onCtaClick?: (planId: string, billing: BillingCycle) => void;
  className?: string;
};
