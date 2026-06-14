"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { transform, type TransformError } from "@json-transformer/core";
import { CircleHelp, FileJson2, LayoutTemplate, Search } from "lucide-react";
import { useDebounce } from "@/lib/use-debounce";
import { dslToRows, newRow, rowsToDsl, type BuilderRow } from "@/lib/builder";
import { extractPaths } from "@/lib/json-paths";
import { HelpDialog, type HelpExample } from "@/components/help-dialog";
import type { FieldMapping } from "@/lib/field-mapping";
import { TemplateGallery } from "@/components/template-gallery";
import { WorkbenchCommandPalette } from "@/components/workbench-command-palette";
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
import { SAMPLE_DSL, SAMPLE_INPUT } from "@/lib/shared";
import { InputPanel } from "@/components/input-panel-and-fields/input-panel";
import { TransformPanel } from "@/components/transform-panel/transform-panel";
import { OutputPanel } from "@/components/output-panel/output-panel";
import type { EditorMode, PanelError } from "@/types/types";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [inputText, setInputText] = useState(SAMPLE_INPUT);
  const [dslText, setDslText] = useState(SAMPLE_DSL);
  const [editorMode, setEditorMode] = useState<EditorMode>("builder");
  const [builderRows, setBuilderRows] = useState<BuilderRow[]>(
    () => dslToRows(SAMPLE_DSL) ?? [],
  );
  const [builderNotice, setBuilderNotice] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const debouncedInput = useDebounce(inputText, 200);
  const debouncedDsl = useDebounce(dslText, 200);
  const transformFingerprintRef = useRef<string | null>(null);

  const parsedInputForHints = useMemo(() => {
    try {
      return JSON.parse(debouncedInput) as unknown;
    } catch {
      return undefined;
    }
  }, [debouncedInput]);

  const pathSuggestions = useMemo(
    () => extractPaths(parsedInputForHints),
    [parsedInputForHints],
  );

  function handleRowsChange(rows: BuilderRow[]) {
    setBuilderRows(rows);
    setDslText(JSON.stringify(rowsToDsl(rows), null, 2));
  }

  function loadDslSample() {
    setInputText(SAMPLE_INPUT);
    setDslText(SAMPLE_DSL);
    setBuilderRows(dslToRows(SAMPLE_DSL) ?? []);
    setBuilderNotice(null);
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
      const rows = dslToRows(dslText);
      if (rows === null) {
        setBuilderNotice(
          "This transform uses features the builder doesn't support yet (nested objects or invalid JSON). Keep editing it as DSL.",
        );
        return;
      }
      setBuilderRows(rows);
    }
    setBuilderNotice(null);
    trackModeSwitched({ from_mode: editorMode, to_mode: mode });
    setEditorMode(mode);
  }

  function handleMapField(mapping: FieldMapping) {
    let rows = builderRows;

    if (editorMode === "dsl") {
      const imported = dslToRows(dslText);
      if (imported === null) {
        setBuilderNotice(
          "Can't add fields visually while the DSL uses unsupported shapes. Edit it in the DSL tab.",
        );
        return;
      }
      rows = imported;
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
    const inputJson = JSON.stringify(example.input, null, 2);
    const dslJson = JSON.stringify(example.dsl, null, 2);
    setInputText(inputJson);
    setDslText(dslJson);
    setBuilderRows(dslToRows(dslJson) ?? []);
    setBuilderNotice(null);
    trackHelpExampleLoaded();
    setHelpOpen(false);
  }

  function useTemplate(template: Template) {
    const inputJson = JSON.stringify(template.input, null, 2);
    const dslJson = JSON.stringify(template.dsl, null, 2);
    setInputText(inputJson);
    setDslText(dslJson);
    setBuilderRows(dslToRows(dslJson) ?? []);
    setBuilderNotice(null);
    setEditorMode("builder");
    setTemplatesOpen(false);
    trackTemplateLoaded({
      template_id: template.id,
      template_name: template.name,
      template_category: template.category,
      editor_mode: "builder",
    });
  }

  const result = useMemo(() => {
    let parsedInput: unknown;
    let inputError: PanelError = null;
    let dslError: PanelError = null;
    let output: string | null = null;
    let warnings: TransformError[] = [];

    if (debouncedInput.trim() === "") {
      inputError = {
        title: "No input",
        detail: "Paste some JSON to get started.",
      };
    } else {
      try {
        parsedInput = JSON.parse(debouncedInput);
      } catch (err) {
        inputError = {
          title: "Invalid JSON input",
          detail: err instanceof Error ? err.message : "Could not parse JSON.",
        };
      }
    }

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

    if (!inputError && !dslError) {
      const res = transform(parsedInput, parsedDsl as never);
      output = JSON.stringify(res.output, null, 2);
      warnings = res.errors;
    }

    return { inputError, dslError, output, warnings };
  }, [debouncedInput, debouncedDsl]);

  useEffect(() => {
    if (result.inputError || result.dslError || result.output == null) return;

    const fingerprint = `${debouncedInput}::${debouncedDsl}::${result.warnings.length}`;
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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <FileJson2 className="size-5 text-muted-foreground" />
          <h1 className="font-heading text-sm font-semibold tracking-wide">
            JSON Transform Workbench
          </h1>
        </div>
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

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onTryExample={tryExample}
      />

      <TemplateGallery
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onUse={useTemplate}
      />

      <WorkbenchCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        editorMode={editorMode}
        onUseTemplate={useTemplate}
        onTryExample={tryExample}
        onSwitchMode={switchMode}
        onLoadInputSample={loadDslSample}
        onLoadDslSample={loadDslSample}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
      />

      <main className="grid min-h-0 flex-1 overflow-hidden grid-cols-1 md:grid-cols-3 md:grid-rows-[minmax(0,1fr)]">
        <InputPanel
          inputText={inputText}
          onInputChange={setInputText}
          onLoadSample={loadDslSample}
          onInputPaste={handleInputPaste}
          parsedInput={parsedInputForHints}
          onMapField={handleMapField}
          inputError={result.inputError}
        />

        <TransformPanel
          editorMode={editorMode}
          onSwitchMode={switchMode}
          onLoadDslSample={loadDslSample}
          builderRows={builderRows}
          pathSuggestions={pathSuggestions}
          parsedInput={parsedInputForHints}
          warnings={result.warnings}
          onRowsChange={handleRowsChange}
          dslText={dslText}
          onDslChange={setDslText}
          builderNotice={builderNotice}
          dslError={result.dslError}
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
