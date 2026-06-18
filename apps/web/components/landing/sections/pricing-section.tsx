"use client";

import { useRouter } from "next/navigation";
import { PricingSection } from "@/components/pricing-section";
import { Reveal } from "@/components/ui/reveal";
import { PRICING_PLANS } from "../landing-data";

export function LandingPricingSection() {
  const router = useRouter();

  return (
    <Reveal animation="fade-up">
      <PricingSection
        plans={PRICING_PLANS}
        highlightedPlanId="pro"
        onCtaClick={() => router.push("/app")}
        className="scroll-mt-24"
      />
    </Reveal>
  );
}
