"use client";

import { AvatarGroupRow } from "@/components/ui/avatar-group-row";
import { Reveal } from "@/components/ui/reveal";
import { SOCIAL_PROOF_AVATARS } from "../landing-data";

export function SocialProofSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <Reveal animation="fade-up">
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-border/60 bg-card/40 px-6 py-10 text-center backdrop-blur-sm">
          <AvatarGroupRow
            avatars={[...SOCIAL_PROOF_AVATARS]}
            maxVisible={3}
            label="Built by a developer who got tired of reshaping the same JSON over and over again."
            className="justify-center"
            labelClassName="max-w-md text-sm text-muted-foreground"
          />
        </div>
      </Reveal>
    </section>
  );
}
