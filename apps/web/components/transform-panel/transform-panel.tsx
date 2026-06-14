"use client";

import { useMemo } from "react";
import type { TransformError } from "@json-transformer/core";
import { TransformBuilder } from "@/components/transform-builder";
import { LineNumberTextarea } from "@/components/line-number-textarea";
import { ErrorBanner } from "@/components/ui/error-banner";
import { TabButton } from "@/components/ui/tab-button";
import type { BuilderRow } from "@/lib/builder";
import { itemFieldsFor, type PathSuggestion } from "@/lib/json-paths";
import type { EditorMode, PanelError } from "@/types/types";

interface TransformPanelProps {
  editorMode: EditorMode;
  onSwitchMode: (mode: EditorMode) => void;
  onLoadDslSample: () => void;
  builderRows: BuilderRow[];
  pathSuggestions: PathSuggestion[];
  parsedInput: unknown;
  warnings: TransformError[];
  onRowsChange: (rows: BuilderRow[]) => void;
  dslText: string;
  onDslChange: (value: string) => void;
  builderNotice: string | null;
  dslError: PanelError;
}

export function TransformPanel({
  editorMode,
  onSwitchMode,
  onLoadDslSample,
  builderRows,
  pathSuggestions,
  parsedInput,
  warnings,
  onRowsChange,
  dslText,
  onDslChange,
  builderNotice,
  dslError,
}: TransformPanelProps) {
  const rowErrors = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const w of warnings) {
      if (!w.outputField) continue;
      const key = w.outputField.replace(/\[\d+\].*/, "");
      const list = (map[key] ??= []);
      if (!list.includes(w.message)) list.push(w.message);
    }
    return map;
  }, [warnings]);

  return (
    <section className="flex min-h-0 flex-col overflow-hidden border-b md:border-b-0 md:border-r">
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Transform
        </h2>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-md border p-0.5">
            <TabButton
              active={editorMode === "builder"}
              onClick={() => onSwitchMode("builder")}
            >
              Builder
            </TabButton>
            <TabButton
              active={editorMode === "dsl"}
              onClick={() => onSwitchMode("dsl")}
            >
              DSL
            </TabButton>
          </div>
          <button
            type="button"
            onClick={onLoadDslSample}
            className="rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Load sample
          </button>
        </div>
      </div>

      {editorMode === "builder" ? (
        <TransformBuilder
          rows={builderRows}
          paths={pathSuggestions}
          itemFields={(arrayPath) => itemFieldsFor(parsedInput, arrayPath)}
          rowErrors={rowErrors}
          onChange={onRowsChange}
        />
      ) : (
        <LineNumberTextarea
          value={dslText}
          onChange={(e) => onDslChange(e.target.value)}
          spellCheck={false}
          placeholder='{ "fullName": "$user.first + \u0027 \u0027 + $user.last" }'
        />
      )}

      {builderNotice && (
        <div className="shrink-0 border-t bg-amber-500/10 px-3 py-2">
          <p className="font-mono text-[11px] text-amber-200/90">
            {builderNotice}
          </p>
        </div>
      )}
      {dslError && (
        <ErrorBanner title={dslError.title} detail={dslError.detail} />
      )}
    </section>
  );
}
