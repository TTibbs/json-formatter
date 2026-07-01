import { HeroSection } from "@/components/landing/sections/hero-section";
import { ProblemSection } from "@/components/landing/sections/problem-section";
import { ProductDemoSection } from "@/components/landing/sections/product-demo-section";
import { HowItWorksSection } from "@/components/landing/sections/how-it-works-section";
import { UseCasesSection } from "@/components/landing/sections/use-cases-section";
import { ExamplesSection } from "@/components/landing/sections/examples-section";
import { ComparisonSection } from "@/components/landing/sections/comparison-section";
import { FinalCtaSection } from "@/components/landing/sections/final-cta-section";

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <main>
        <HeroSection />
        <ProblemSection />
        <ProductDemoSection />
        <HowItWorksSection />
        <UseCasesSection />
        <ExamplesSection />
        <ComparisonSection />
        <FinalCtaSection />
      </main>
      <footer className="border-t border-border/60 px-4 py-7 text-center text-sm text-muted-foreground">
        JSON Transformer · A{" "}
        <a
          href="https://tibbstech.co.uk"
          target="_blank"
          rel="noreferrer"
          className="text-emerald-400 transition-colors hover:text-emerald-300"
        >
          Tibbs Tech
        </a>{" "}
        tool
      </footer>
    </div>
  );
}
