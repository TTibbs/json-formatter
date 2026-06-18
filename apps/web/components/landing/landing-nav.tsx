"use client";

import Link from "next/link";
import { FileJson2 } from "lucide-react";
import { GlassHeader } from "@/components/ui/glass-header";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { ANCHORS } from "./landing-data";

const NAV_LINKS = [
  { label: "Examples", href: `#${ANCHORS.examples}` },
  { label: "Pricing", href: `#${ANCHORS.pricing}` },
  { label: "Docs", href: `#${ANCHORS.howItWorks}` },
] as const;

export function LandingNav() {
  return (
    <GlassHeader>
      <Link
        href="/"
        className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
      >
        <div className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-cyan-600">
          <FileJson2 className="size-4 text-white" />
        </div>
        <span className="font-heading text-sm font-semibold tracking-wide text-foreground">
          JSON Transformer
        </span>
      </Link>

      <nav
        className="hidden items-center gap-6 md:flex"
        aria-label="Primary navigation"
      >
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm text-foreground/75 transition-colors hover:text-foreground"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <Link href="/app" className="shrink-0">
        <ShimmerButton title="Try It Free" className="max-w-none w-auto px-5" />
      </Link>
    </GlassHeader>
  );
}
