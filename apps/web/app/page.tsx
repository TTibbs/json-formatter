import { LandingNav } from "@/components/landing/landing-nav";
import { HeroSection } from "@/components/landing/sections/hero-section";
import { ProblemSection } from "@/components/landing/sections/problem-section";
import { ProductDemoSection } from "@/components/landing/sections/product-demo-section";
import { HowItWorksSection } from "@/components/landing/sections/how-it-works-section";
import { UseCasesSection } from "@/components/landing/sections/use-cases-section";
import { ExamplesSection } from "@/components/landing/sections/examples-section";
import { ComparisonSection } from "@/components/landing/sections/comparison-section";
import { SocialProofSection } from "@/components/landing/sections/social-proof-section";
import { LandingPricingSection } from "@/components/landing/sections/pricing-section";
import { FinalCtaSection } from "@/components/landing/sections/final-cta-section";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <HeroSection />
        <ProblemSection />
        <ProductDemoSection />
        <HowItWorksSection />
        <UseCasesSection />
        <ExamplesSection />
        <ComparisonSection />
        <SocialProofSection />
        <section id="pricing">
          <LandingPricingSection />
        </section>
        <FinalCtaSection />
      </main>
      <footer className="border-t border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
        JSON Transformer — reshape data between systems.
      </footer>
    </div>
  );
}
