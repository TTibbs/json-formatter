"use client";

import { useMemo } from "react";
import type { TransformError } from "@json-transformer/core";
import { LineNumberPre } from "@/components/line-number-textarea";
import { CopyButton } from "@/components/ui/copy-button";

interface OutputPanelProps {
  output: string | null;
  warnings: TransformError[];
  onOutputCopied?: () => void;
}

export function OutputPanel({
  output,
  warnings,
  onOutputCopied,
}: OutputPanelProps) {
  const groupedWarnings = useMemo(() => {
    const groups = new Map<string, TransformError[]>();
    for (const w of warnings) {
      const key = w.outputField ?? "(transform)";
      const list = groups.get(key) ?? [];
      list.push(w);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [warnings]);

  return (
    <section className="flex min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Output
        </h2>
        <CopyButton
          value={output ?? ""}
          disabled={output == null}
          size="xs"
          variant="outline"
          copiedText="Copied"
          className="text-xs text-muted-foreground"
          onCopied={onOutputCopied}
        />
      </div>
      <LineNumberPre
        value={output}
        emptyMessage="Fix the errors on the left to see output."
      />
      {warnings.length > 0 && (
        <div className="max-h-32 overflow-auto border-t bg-amber-500/10 px-3 py-2">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-amber-500">
            Warnings
          </p>
          <ul className="space-y-1">
            {groupedWarnings.map(([field, fieldWarnings]) => (
              <li key={field}>
                <p className="font-mono text-[11px] font-semibold text-amber-400">
                  {field}
                </p>
                <ul className="space-y-0.5 pl-3">
                  {fieldWarnings.map((w, i) => (
                    <li
                      key={i}
                      className="font-mono text-[11px] text-amber-200/90"
                    >
                      [{w.type}] {w.message}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
