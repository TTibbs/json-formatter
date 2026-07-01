"use client";

import { useMemo } from "react";
import type { TransformError, TransformGraph } from "@json-transformer/core";
import { GraphEditor } from "@/components/graph-editor/graph-editor";
import { TransformBuilder } from "@/components/transform-builder";
import { LineNumberTextarea } from "@/components/line-number-textarea";
import { ErrorBanner } from "@/components/ui/error-banner";
import { TabButton } from "@/components/ui/tab-button";
import type { BuilderRow, OutputSortSettings } from "@/lib/builder";
import { itemFieldsFor, type PathSuggestion } from "@/lib/json-paths";
import type { EditorMode, PanelError } from "@/types/types";

interface TransformPanelProps {
  editorMode: EditorMode;
  onSwitchMode: (mode: EditorMode) => void;
  onLoadDslSample: () => void;
  onLoadGraphSample: () => void;
  builderRows: BuilderRow[];
  pathSuggestions: PathSuggestion[];
  pathSuggestionsTruncated?: boolean;
  parsedInput: unknown;
  warnings: TransformError[];
  onRowsChange: (rows: BuilderRow[]) => void;
  sortSettings: OutputSortSettings;
  onSortSettingsChange: (settings: OutputSortSettings) => void;
  dslText: string;
  onDslChange: (value: string) => void;
  graph: TransformGraph;
  onGraphChange: (graph: TransformGraph) => void;
  builderNotice: string | null;
  dslError: PanelError;
  hasSortInDsl?: boolean;
}

export function TransformPanel({
  editorMode,
  onSwitchMode,
  onLoadDslSample,
  onLoadGraphSample,
  builderRows,
  pathSuggestions,
  pathSuggestionsTruncated = false,
  parsedInput,
  warnings,
  onRowsChange,
  sortSettings,
  onSortSettingsChange,
  dslText,
  onDslChange,
  graph,
  onGraphChange,
  builderNotice,
  dslError,
  hasSortInDsl = false,
}: TransformPanelProps) {
  const rowErrors = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const w of warnings) {
      const key = w.outputField?.replace(/\[\d+\].*/, "") ?? w.nodeId;
      if (!key) continue;
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
          {editorMode === "dsl" && dslText.includes("$pipeline") && (
            <span className="rounded border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-300">
              Pipeline
            </span>
          )}
          {editorMode !== "builder" && hasSortInDsl && (
            <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
              Sorted
            </span>
          )}
          {editorMode === "graph" && (
            <span className="rounded border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-300">
              Graph
            </span>
          )}
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
            <TabButton
              active={editorMode === "graph"}
              onClick={() => onSwitchMode("graph")}
            >
              Graph
            </TabButton>
          </div>
          <button
            type="button"
            onClick={editorMode === "graph" ? onLoadGraphSample : onLoadDslSample}
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
          pathSuggestionsTruncated={pathSuggestionsTruncated}
          itemFields={(arrayPath) => itemFieldsFor(parsedInput, arrayPath)}
          rowErrors={rowErrors}
          sortSettings={sortSettings}
          onSortSettingsChange={onSortSettingsChange}
          onChange={onRowsChange}
        />
      ) : editorMode === "graph" ? (
        <GraphEditor graph={graph} onChange={onGraphChange} />
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
