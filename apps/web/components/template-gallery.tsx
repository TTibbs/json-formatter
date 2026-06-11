"use client";

import { useEffect } from "react";
import { ArrowRight, X } from "lucide-react";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATES,
  type Template,
} from "@/lib/templates";

interface TemplateGalleryProps {
  open: boolean;
  onClose: () => void;
  onUse: (template: Template) => void;
}

export function TemplateGallery({ open, onClose, onUse }: TemplateGalleryProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Transform templates"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Templates</h2>
            <p className="text-[11px] text-muted-foreground">
              Real-world starting points — each loads a sample payload and a
              ready-made transform you can tweak in the Builder.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close templates"
            className="rounded-md border p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-auto p-4">
          {TEMPLATE_CATEGORIES.map((category) => {
            const templates = TEMPLATES.filter((t) => t.category === category);
            if (templates.length === 0) return null;
            return (
              <section key={category}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {category}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onUse={() => onUse(template)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onUse,
}: {
  template: Template;
  onUse: () => void;
}) {
  const [from, to] = template.name.split(" -> ");

  return (
    <div className="flex flex-col rounded-lg border bg-card/40 p-3">
      <div className="flex items-center gap-1.5 font-mono text-xs text-foreground/90">
        <span>{from}</span>
        <ArrowRight className="size-3 shrink-0 text-muted-foreground/70" />
        <span>{to}</span>
      </div>

      <p className="mt-1.5 flex-1 text-[11px] leading-relaxed text-muted-foreground">
        {template.description}
      </p>

      <pre className="mt-2 max-h-28 overflow-auto rounded-md border bg-background p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
        {JSON.stringify(template.dsl, null, 2)}
      </pre>

      <button
        type="button"
        onClick={onUse}
        className="mt-2 flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        Use template
      </button>
    </div>
  );
}
