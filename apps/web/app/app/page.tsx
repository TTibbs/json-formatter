"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { runGraph, transform, type TransformError } from "@json-transformer/core";
import { CircleHelp, FileJson2, LayoutTemplate, Search } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/lib/use-debounce";
import {
  DEFAULT_OUTPUT_SORT_SETTINGS,
  dslToBuilder,
  newRow,
  rowsToDsl,
  type BuilderRow,
  type OutputSortSettings,
} from "@/lib/builder";
import { extractPaths } from "@/lib/json-paths";
import type { HelpExample } from "@/components/help-dialog";
import type { FieldMapping } from "@/lib/field-mapping";
import type { Template } from "@/lib/templates";
import {
  trackFieldMapped,
  trackHelpExampleLoaded,
  trackJsonPasted,
  trackModeSwitched,
  trackOutputCopied,
  trackTemplateLoaded,
  trackTransformCompleted,
  trackTransformWarning,
} from "@/lib/analytics";
import {
  getDefaultExampleForMode,
  SAMPLE_DSL,
  SAMPLE_INPUT,
  type WorkbenchExample,
} from "@/lib/shared";
import {
  createReshapeAndProjectGraph,
  parseGraph,
  serializeGraph,
  type TransformGraph,
} from "@/lib/graph";
import { InputPanel } from "@/components/input-panel-and-fields/input-panel";
import { TransformPanel } from "@/components/transform-panel/transform-panel";
import { OutputPanel } from "@/components/output-panel/output-panel";
import type { EditorMode, PanelError } from "@/types/types";
import { Button } from "@/components/ui/button";

const HelpDialog = dynamic(
  () => import("@/components/help-dialog").then((m) => m.HelpDialog),
  { ssr: false },
);

const TemplateGallery = dynamic(
  () => import("@/components/template-gallery").then((m) => m.TemplateGallery),
  { ssr: false },
);

const WorkbenchCommandPalette = dynamic(
  () =>
    import("@/components/workbench-command-palette").then(
      (m) => m.WorkbenchCommandPalette,
    ),
  { ssr: false },
);

/** Skip live transform above this input size (bytes). */
const MAX_LIVE_TRANSFORM_INPUT_BYTES = 512 * 1024;
/** Pretty-print output only below this serialized length. */
const MAX_PRETTY_OUTPUT_CHARS = 32_000;

function formatJsonOutput(value: unknown): string {
  const compact = JSON.stringify(value);
  if (compact.length <= MAX_PRETTY_OUTPUT_CHARS) {
    return JSON.stringify(value, null, 2);
  }
  return compact;
}

function sortSettingsEqual(
  a: OutputSortSettings,
  b: OutputSortSettings,
): boolean {
  return a.order === b.order && a.arrayField === b.arrayField;
}

function builderRowsEqual(a: BuilderRow[], b: BuilderRow[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((row, i) => {
    const other = b[i]!;
    return (
      row.id === other.id &&
      row.outputKey === other.outputKey &&
      row.operation === other.operation &&
      row.source === other.source &&
      row.select === other.select &&
      row.value === other.value &&
      row.separator === other.separator &&
      row.parts.length === other.parts.length &&
      row.parts.every((part, j) => part === other.parts[j]) &&
      row.condField === other.condField &&
      row.condOp === other.condOp &&
      row.condValue === other.condValue &&
      row.thenValue === other.thenValue &&
      row.elseValue === other.elseValue
    );
  });
}

export default function WorkbenchPage() {
  const [inputText, setInputText] = useState(SAMPLE_INPUT);
  const [dslText, setDslText] = useState(SAMPLE_DSL);
  const [editorMode, setEditorMode] = useState<EditorMode>("builder");
  const [builderRows, setBuilderRows] = useState<BuilderRow[]>(
    () => dslToBuilder(SAMPLE_DSL)?.rows ?? [],
  );
  const [outputSortSettings, setOutputSortSettings] = useState<OutputSortSettings>(
    () => dslToBuilder(SAMPLE_DSL)?.sortSettings ?? DEFAULT_OUTPUT_SORT_SETTINGS,
  );
  const [builderNotice, setBuilderNotice] = useState<string | null>(null);
  const [graph, setGraph] = useState<TransformGraph>(() =>
    createReshapeAndProjectGraph(),
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const debouncedInput = useDebounce(inputText, 200);
  const debouncedDsl = useDebounce(dslText, 200);
  const serializedGraph = useMemo(
    () => (editorMode === "graph" ? serializeGraph(graph) : ""),
    [editorMode, graph],
  );
  const debouncedGraph = useDebounce(serializedGraph, 200);
  const transformFingerprintRef = useRef<string | null>(null);

  const parsedInputResult = useMemo(() => {
    if (debouncedInput.trim() === "") {
      return {
        status: "empty" as const,
      };
    }
    if (debouncedInput.length > MAX_LIVE_TRANSFORM_INPUT_BYTES) {
      return {
        status: "too_large" as const,
      };
    }
    try {
      return {
        status: "ok" as const,
        value: JSON.parse(debouncedInput) as unknown,
      };
    } catch (err) {
      return {
        status: "invalid" as const,
        error: {
          title: "Invalid JSON input",
          detail:
            err instanceof Error ? err.message : "Could not parse JSON.",
        },
      };
    }
  }, [debouncedInput]);

  const parsedInputForHints =
    parsedInputResult.status === "ok" ? parsedInputResult.value : undefined;

  const pathExtraction = useMemo(() => {
    if (editorMode !== "builder" || parsedInputResult.status !== "ok") {
      return { paths: [], truncated: false };
    }
    return extractPaths(parsedInputResult.value);
  }, [editorMode, parsedInputResult]);
  const pathSuggestions = pathExtraction.paths;

  function applyBuilderState(
    rows: BuilderRow[],
    sortSettings: OutputSortSettings,
  ) {
    setBuilderRows(rows);
    setOutputSortSettings(sortSettings);
    setDslText(JSON.stringify(rowsToDsl(rows, sortSettings), null, 2));
  }

  function handleRowsChange(rows: BuilderRow[]) {
    applyBuilderState(rows, outputSortSettings);
  }

  function handleSortSettingsChange(sortSettings: OutputSortSettings) {
    applyBuilderState(builderRows, sortSettings);
  }

  function loadBuilderFromDsl(dslJson: string) {
    const parsed = dslToBuilder(dslJson);
    if (!parsed) return false;
    setBuilderRows(parsed.rows);
    setOutputSortSettings(parsed.sortSettings);
    if (parsed.unsupportedSort) {
      setBuilderNotice(
        "Custom sort in DSL — edit in the DSL tab.",
      );
    }
    return true;
  }

  function applyWorkbenchExample(
    example: WorkbenchExample | HelpExample,
  ) {
    const inputJson = JSON.stringify(example.input, null, 2);
    setInputText(inputJson);

    const mode = example.mode ?? "builder";

    if (mode === "graph" && example.graph) {
      setGraph(structuredClone(example.graph));
      setBuilderNotice(null);
      setEditorMode("graph");
      return;
    }

    if (!example.dsl) return;

    const dslJson = JSON.stringify(example.dsl, null, 2);
    setDslText(dslJson);

    if (mode === "builder") {
      loadBuilderFromDsl(dslJson);
      if (!dslToBuilder(dslJson)?.unsupportedSort) {
        setBuilderNotice(null);
      }
      setEditorMode("builder");
    } else {
      setBuilderNotice(null);
      setEditorMode("dsl");
    }
  }

  function loadDslSample() {
    applyWorkbenchExample(getDefaultExampleForMode("builder"));
  }

  function loadGraphSample() {
    applyWorkbenchExample(getDefaultExampleForMode("graph"));
  }

  function loadWorkbenchSample() {
    if (editorMode === "graph") loadGraphSample();
    else loadDslSample();
  }

  function handleInputPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = e.clipboardData.getData("text");
    let inputValid = false;
    try {
      JSON.parse(pasted);
      inputValid = true;
    } catch {
      // invalid JSON paste — still tracked
    }
    trackJsonPasted({
      paste_length: pasted.length,
      input_valid: inputValid,
      editor_mode: editorMode,
    });
  }

  function switchMode(mode: EditorMode) {
    if (mode === editorMode) return;
    if (mode === "builder") {
      const parsed = dslToBuilder(dslText);
      if (parsed === null) {
        setBuilderNotice(
          "This transform uses features the builder doesn't support yet (nested objects or invalid JSON). Keep editing it as DSL.",
        );
        return;
      }
      setBuilderRows(parsed.rows);
      setOutputSortSettings(parsed.sortSettings);
      if (parsed.unsupportedSort) {
        setBuilderNotice("Custom sort in DSL — edit in the DSL tab.");
      } else {
        setBuilderNotice(null);
      }
    } else {
      setBuilderNotice(null);
    }
    trackModeSwitched({ from_mode: editorMode, to_mode: mode });
    setEditorMode(mode);
  }

  function handleMapField(mapping: FieldMapping) {
    let rows = builderRows;

    if (editorMode === "dsl") {
      const imported = dslToBuilder(dslText);
      if (imported === null) {
        setBuilderNotice(
          "Can't add fields visually while the DSL uses unsupported shapes. Edit it in the DSL tab.",
        );
        return;
      }
      rows = imported.rows;
      setOutputSortSettings(imported.sortSettings);
    }

    const usedKeys = new Set(rows.map((r) => r.outputKey));
    let key = mapping.outputKey;
    for (let i = 2; usedKeys.has(key); i++) key = `${mapping.outputKey}${i}`;

    handleRowsChange([
      ...rows,
      newRow({
        outputKey: key,
        operation: mapping.operation,
        source: mapping.source,
        select: mapping.select ?? "",
      }),
    ]);
    trackFieldMapped({ operation: mapping.operation, editor_mode: editorMode });
    setBuilderNotice(null);
    setEditorMode("builder");
  }

  function tryExample(example: HelpExample) {
    applyWorkbenchExample(example);
    trackHelpExampleLoaded();
    setHelpOpen(false);
  }

  function useTemplate(template: Template) {
    const mode =
      template.preferredMode ?? (template.dslOnly ? "dsl" : "builder");

    if (mode === "graph" && template.graph) {
      setInputText(JSON.stringify(template.input, null, 2));
      setGraph(structuredClone(template.graph));
      setBuilderNotice(null);
      setEditorMode("graph");
    } else {
      const dslJson = JSON.stringify(template.dsl, null, 2);
      setInputText(JSON.stringify(template.input, null, 2));
      setDslText(dslJson);
      if (mode === "builder" && !template.dslOnly) {
        loadBuilderFromDsl(dslJson);
      } else {
        setBuilderNotice(null);
      }
      setEditorMode(mode === "dsl" ? "dsl" : "builder");
    }

    setTemplatesOpen(false);
    trackTemplateLoaded({
      template_id: template.id,
      template_name: template.name,
      template_category: template.category,
      editor_mode: mode,
    });
  }

  const result = useMemo(() => {
    let inputError: PanelError = null;
    let dslError: PanelError = null;
    let output: string | null = null;
    let warnings: TransformError[] = [];

    if (parsedInputResult.status === "empty") {
      inputError = {
        title: "No input",
        detail: "Paste some JSON to get started.",
      };
    } else if (parsedInputResult.status === "too_large") {
      inputError = {
        title: "Input too large for live preview",
        detail: `Paste is over ${Math.round(MAX_LIVE_TRANSFORM_INPUT_BYTES / 1024)} KB. Trim the payload or work in smaller chunks.`,
      };
    } else if (parsedInputResult.status === "invalid") {
      inputError = parsedInputResult.error;
    }

    const parsedInput =
      parsedInputResult.status === "ok" ? parsedInputResult.value : undefined;

    if (editorMode === "graph") {
      const parsedGraph = parseGraph(debouncedGraph);
      if (!parsedGraph) {
        dslError = {
          title: "Invalid graph",
          detail: "The graph must be valid JSON with version 2.",
        };
      } else if (!inputError && parsedInput !== undefined) {
        const res = runGraph(parsedInput, parsedGraph);
        output = formatJsonOutput(res.output);
        warnings = res.errors;
      }
    } else {
      let parsedDsl: unknown;
      if (debouncedDsl.trim() === "") {
        dslError = {
          title: "No transform",
          detail: "Write a DSL object to transform the input.",
        };
      } else {
        try {
          parsedDsl = JSON.parse(debouncedDsl);
        } catch (err) {
          dslError = {
            title: "Invalid DSL",
            detail:
              err instanceof Error ? err.message : "The DSL must be valid JSON.",
          };
        }
      }

      if (!inputError && !dslError && parsedInput !== undefined) {
        const res = transform(parsedInput, parsedDsl as never);
        output = formatJsonOutput(res.output);
        warnings = res.errors;
      }
    }

    return { inputError, dslError, output, warnings };
  }, [parsedInputResult, debouncedDsl, debouncedGraph, editorMode]);

  useEffect(() => {
    if (result.inputError || result.dslError || result.output == null) return;

    const fingerprint = `${debouncedInput}::${editorMode}::${editorMode === "graph" ? debouncedGraph : debouncedDsl}::${result.warnings.length}`;
    if (transformFingerprintRef.current === fingerprint) return;
    transformFingerprintRef.current = fingerprint;

    const baseProps = {
      editor_mode: editorMode,
      input_size: debouncedInput.length,
      dsl_size: debouncedDsl.length,
    };

    if (result.warnings.length === 0) {
      let outputFieldCount = 0;
      try {
        const parsed = JSON.parse(result.output) as unknown;
        if (
          parsed !== null &&
          typeof parsed === "object" &&
          !Array.isArray(parsed)
        ) {
          outputFieldCount = Object.keys(parsed).length;
        } else {
          outputFieldCount = 1;
        }
      } catch {
        outputFieldCount = 0;
      }
      trackTransformCompleted({
        ...baseProps,
        warning_count: 0,
        output_field_count: outputFieldCount,
      });
    } else {
      trackTransformWarning({
        ...baseProps,
        warning_count: result.warnings.length,
        warning_types: [...new Set(result.warnings.map((w) => w.type))],
      });
    }
  }, [result, debouncedInput, debouncedDsl, editorMode]);

  useEffect(() => {
    if (editorMode !== "dsl") return;

    const parsed = dslToBuilder(debouncedDsl);
    if (parsed === null) return;

    setOutputSortSettings((current) =>
      sortSettingsEqual(current, parsed.sortSettings)
        ? current
        : parsed.sortSettings,
    );
    setBuilderRows((current) =>
      builderRowsEqual(current, parsed.rows) ? current : parsed.rows,
    );
  }, [debouncedDsl, editorMode]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "k") return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      e.preventDefault();
      setCommandPaletteOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <FileJson2 className="size-5 text-muted-foreground" />
          <h1 className="font-heading text-sm font-semibold tracking-wide">
            JSON Transform Workbench
          </h1>
        </Link>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCommandPaletteOpen(true)}
            className="w-64 items-center justify-between"
          >
            <Search className="size-3.5" />
            Commands
            <kbd className="rounded border bg-muted/50 px-1 font-mono text-[10px] leading-none text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplatesOpen(true)}
          >
            <LayoutTemplate className="size-3.5" />
            Templates
          </Button>
          <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}>
            <CircleHelp className="size-3.5" />
            Help
          </Button>
        </div>
      </header>

      {helpOpen ? (
        <HelpDialog
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          onTryExample={tryExample}
        />
      ) : null}

      {templatesOpen ? (
        <TemplateGallery
          open={templatesOpen}
          onClose={() => setTemplatesOpen(false)}
          onUse={useTemplate}
        />
      ) : null}

      {commandPaletteOpen ? (
        <WorkbenchCommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          editorMode={editorMode}
          onUseTemplate={useTemplate}
          onTryExample={tryExample}
          onSwitchMode={switchMode}
          onLoadInputSample={loadWorkbenchSample}
          onLoadDslSample={loadDslSample}
          onLoadGraphSample={loadGraphSample}
          onOpenTemplates={() => setTemplatesOpen(true)}
          onOpenHelp={() => setHelpOpen(true)}
        />
      ) : null}

      <main className="grid min-h-0 flex-1 overflow-hidden grid-cols-1 md:grid-cols-3 md:grid-rows-[minmax(0,1fr)]">
        <InputPanel
          inputText={inputText}
          onInputChange={setInputText}
          onLoadSample={loadWorkbenchSample}
          onInputPaste={handleInputPaste}
          parsedInput={parsedInputForHints}
          onMapField={handleMapField}
          inputError={result.inputError}
        />

        <TransformPanel
          editorMode={editorMode}
          onSwitchMode={switchMode}
          onLoadDslSample={loadDslSample}
          onLoadGraphSample={loadGraphSample}
          builderRows={builderRows}
          pathSuggestions={pathSuggestions}
          pathSuggestionsTruncated={pathExtraction.truncated}
          parsedInput={parsedInputForHints}
          warnings={result.warnings}
          onRowsChange={handleRowsChange}
          sortSettings={outputSortSettings}
          onSortSettingsChange={handleSortSettingsChange}
          dslText={dslText}
          onDslChange={setDslText}
          graph={graph}
          onGraphChange={setGraph}
          builderNotice={builderNotice}
          dslError={result.dslError}
          hasSortInDsl={dslText.includes("$sort")}
        />

        <OutputPanel
          output={result.output}
          warnings={result.warnings}
          onOutputCopied={() => {
            if (result.output == null) return;
            trackOutputCopied({
              output_length: result.output.length,
              warning_count: result.warnings.length,
            });
          }}
        />
      </main>
    </div>
  );
}
