"use client";

import { useEffect } from "react";
import { Play, X } from "lucide-react";
import {
  SAMPLE_INPUT,
  SAMPLE_PIPELINE_DSL,
} from "@/lib/shared";
import { createSampleGraph, serializeGraph } from "@/lib/graph";

export interface HelpExample {
  input: Record<string, unknown>;
  dsl: Record<string, unknown>;
}

export interface HelpSection {
  title: string;
  description: string;
  tips: string[];
  example: HelpExample;
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    title: "Map field",
    description:
      "Copies a value from the input using a dot path. Use [0]-style indices to reach into arrays.",
    tips: [
      "user.name reads input.user.name",
      "items[0].price reads the first item's price",
      "Missing paths never crash — they output null",
    ],
    example: {
      input: {
        user: { name: "Ada", contact: { email: "ada@example.com" } },
        items: [{ price: 49 }, { price: 25 }],
      },
      dsl: {
        name: "user.name",
        email: "user.contact.email",
        firstPrice: "items[0].price",
      },
    },
  },
  {
    title: "Compute (expressions)",
    description:
      "Starts with $ and computes a new value. $ always refers to the input root, so $user.age means input.user.age.",
    tips: [
      "Operators: + - * / > < >= <= == != && ||",
      "Use single quotes for strings: $user.first + ' ' + $user.last",
      "Parentheses work: ($a + $b) * 2",
    ],
    example: {
      input: { user: { first: "John", last: "Doe", age: 25, active: true } },
      dsl: {
        fullName: "$user.first + ' ' + $user.last",
        isAdult: "$user.age > 18",
        canVote: "$user.active && $user.age >= 18",
      },
    },
  },
  {
    title: "Map array",
    description:
      "Loops over an array and picks something from each item. In the builder: choose Map array, set the array source (e.g. users), then the item field to pick from each element.",
    tips: [
      "Source 'users' + field 'email' produces users[].email — a list of every email",
      "The item field is relative to each item — write 'email', NOT '$users.email' or '$email'",
      "Leave the item field empty to keep each whole item (e.g. users[] returns the full objects)",
      "Pick nested fields too: 'notifications' on users gives users[].notifications",
    ],
    example: {
      input: JSON.parse(SAMPLE_INPUT),
      dsl: {
        names: "users[].name",
        emails: "users[].email",
        notifications: "users[].notifications",
      },
    },
  },
  {
    title: "Fixed value",
    description:
      "Outputs a constant, regardless of the input. Numbers, booleans, and null are auto-detected.",
    tips: [
      "'api' stays a string, 42 becomes a number, true becomes a boolean",
      "Plain strings without dots are always treated as fixed values, not paths",
    ],
    example: {
      input: { anything: "ignored" },
      dsl: { source: "api", version: 2, enabled: true },
    },
  },
  {
    title: "Array pipeline ($pipeline)",
    description:
      "Reshape array items before output mapping. Use $pipeline with foreach blocks to move, rename, or remove fields inside each item. Paths inside foreach are item-relative — same as Map array selects. DSL tab only; the builder cannot edit pipeline steps yet.",
    tips: [
      "$pipeline runs on a clone of the input before output fields are evaluated",
      "foreach: \"users\" loops over input.users; steps use paths like \"notifications\", not \"users.notifications\"",
      "move relocates a field; rename is the same for same-level keys; remove deletes a field",
      "Omit output fields to return the reshaped document as-is, or add fields below $pipeline to map the result",
    ],
    example: {
      input: JSON.parse(SAMPLE_INPUT),
      dsl: JSON.parse(SAMPLE_PIPELINE_DSL),
    },
  },
  {
    title: "Graph editor",
    description:
      "Build transforms as a DAG of nodes connected by edges. Use the Graph tab to add map/nest/rename nodes, connect input → map → output, and run directly via runGraph.",
    tips: [
      "input and output nodes are required terminals",
      "Map array nodes reference body node ids (nest, rename, remove) executed per item",
      "Legacy DSL and $pipeline compile to graphs automatically when using transform()",
      "POST /api/graph/run accepts { graph, input } for server-side execution",
    ],
    example: {
      input: JSON.parse(SAMPLE_INPUT),
      dsl: JSON.parse(serializeGraph(createSampleGraph())) as Record<string, unknown>,
    },
  },
];

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
  onTryExample: (example: HelpExample) => void;
}

export function HelpDialog({ open, onClose, onTryExample }: HelpDialogProps) {
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
      aria-label="Help and examples"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">How transforms work</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="rounded-md border p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-auto p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Each entry in your transform defines one output field. The value
            decides what happens: a dot path copies data, a{" "}
            <code className="rounded bg-muted px-1 font-mono">$</code>{" "}
            expression computes something, and{" "}
            <code className="rounded bg-muted px-1 font-mono">array[].field</code>{" "}
            maps over a list. Click{" "}
            <span className="text-foreground">Try it</span> on any example to
            load it into the editors.
          </p>

          {HELP_SECTIONS.map((section) => (
            <section key={section.title} className="rounded-lg border bg-card/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </h3>
                <button
                  type="button"
                  onClick={() => onTryExample(section.example)}
                  className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Play className="size-3" />
                  Try it
                </button>
              </div>

              <p className="mt-1.5 text-xs leading-relaxed text-foreground/90">
                {section.description}
              </p>

              <ul className="mt-2 space-y-1">
                {section.tips.map((tip) => (
                  <li
                    key={tip}
                    className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground"
                  >
                    <span className="text-muted-foreground/50">-</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>

              <pre className="mt-2 overflow-auto rounded-md border bg-background p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {JSON.stringify(section.example.dsl, null, 2)}
              </pre>
            </section>
          ))}

          <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500">
              Common gotchas
            </h3>
            <ul className="mt-2 space-y-1">
              {[
                "Inside Map array, the item field is relative to each item — 'name', not '$items.name'",
                "$ paths are only for Compute expressions; plain paths (user.name) don't need it",
                "Strings in expressions use single quotes: ' ' not \" \"",
                "A plain word like 'api' is a fixed value; add a dot or use the builder's Map field to read a path",
                "$pipeline is DSL-only — use the DSL tab for foreach / move / rename / remove steps",
              ].map((tip) => (
                <li
                  key={tip}
                  className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground"
                >
                  <span className="text-amber-500/60">-</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
