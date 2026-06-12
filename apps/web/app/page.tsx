"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { transform, type TransformError } from "@json-transformer/core";
import { inferFields } from "@json-transformer/core";
import {
  CircleHelp,
  File,
  FileJson2,
  LayoutTemplate,
  Plus,
  Search,
} from "lucide-react";
import { useDebounce } from "@/lib/use-debounce";
import { dslToRows, newRow, rowsToDsl, type BuilderRow } from "@/lib/builder";
import { extractPaths, itemFieldsFor } from "@/lib/json-paths";
import { TransformBuilder } from "@/components/transform-builder";
import { JsonDropzone } from "@/components/json-dropzone";
import {
  LineNumberPre,
  LineNumberTextarea,
} from "@/components/line-number-textarea";
import { CopyButton } from "@/components/ui/copy-button";
import { FileTree } from "@/components/ui/file-tree";
import { HelpDialog, type HelpExample } from "@/components/help-dialog";
import {
  fieldNodesToFileTree,
  fieldTypeLabel,
  isFieldNodeMeta,
  mappingFor,
  type FieldMapping,
} from "@/lib/field-mapping";
import { TemplateGallery } from "@/components/template-gallery";
import { WorkbenchCommandPalette } from "@/components/workbench-command-palette";
import type { Template } from "@/lib/templates";
import {
  trackJsonPasted,
  trackOutputCopied,
  trackTemplateLoaded,
  trackTransformCompleted,
  trackTransformWarning,
} from "@/lib/analytics";

const SAMPLE_INPUT = JSON.stringify(
  {
    user: {
      first: "John",
      last: "Doe",
      age: 25,
      contact: { email: "john@example.com" },
    },
    users: [
      { name: "Ada", email: "ada@example.com", active: true },
      { name: "Linus", email: "linus@example.com", active: false },
    ],
    items: [
      { name: "Keyboard", price: 49 },
      { name: "Mouse", price: 25 },
    ],
  },
  null,
  2,
);

const SAMPLE_DSL = JSON.stringify(
  {
    fullName: "$user.first + ' ' + $user.last",
    isAdult: "$user.age > 18",
    email: "user.contact.email",
    firstItem: "items[0].name",
    emails: "users[].email",
    source: "api",
  },
  null,
  2,
);

type PanelError = { title: string; detail: string } | null;
type EditorMode = "builder" | "dsl";

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

  const detectedFields = useMemo(
    () => inferFields(parsedInputForHints),
    [parsedInputForHints],
  );

  const detectedFieldTreeData = useMemo(
    () => fieldNodesToFileTree(detectedFields),
    [detectedFields],
  );

  function handleRowsChange(rows: BuilderRow[]) {
    setBuilderRows(rows);
    setDslText(JSON.stringify(rowsToDsl(rows), null, 2));
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
    setEditorMode(mode);
  }

  function loadDslSample() {
    setDslText(SAMPLE_DSL);
    setBuilderRows(dslToRows(SAMPLE_DSL) ?? []);
    setBuilderNotice(null);
  }

  function handleMapField(mapping: FieldMapping) {
    let rows = builderRows;

    // Coming from the DSL tab, sync rows first (bail if unrepresentable).
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
    setHelpOpen(false);
  }

  function useTemplate(template: Template) {
    const inputJson = JSON.stringify(template.input, null, 2);
    const dslJson = JSON.stringify(template.dsl, null, 2);
    setInputText(inputJson);
    setDslText(dslJson);
    // Templates are guaranteed builder-compatible (see templates.test.ts).
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

  /** Warnings grouped by output field for the output panel. */
  const groupedWarnings = useMemo(() => {
    const groups = new Map<string, TransformError[]>();
    for (const w of result.warnings) {
      const key = w.outputField ?? "(transform)";
      const list = groups.get(key) ?? [];
      list.push(w);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [result.warnings]);

  /** Deduped messages keyed by top-level output key, for builder row badges. */
  const rowErrors = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const w of result.warnings) {
      if (!w.outputField) continue;
      // "emails[1].name" -> "emails"; plain keys pass through unchanged.
      const key = w.outputField.replace(/\[\d+\].*/, "");
      const list = (map[key] ??= []);
      if (!list.includes(w.message)) list.push(w.message);
    }
    return map;
  }, [result.warnings]);

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
      <header className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
        <FileJson2 className="size-5 text-muted-foreground" />
        <h1 className="font-heading text-sm font-semibold tracking-wide">
          JSON Transform Workbench
        </h1>
        <span className="ml-auto text-xs text-muted-foreground">
          deterministic JSON transforms · no eval
        </span>
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Search className="size-3.5" />
          Commands
          <kbd className="rounded border bg-muted/50 px-1 font-mono text-[10px] leading-none text-muted-foreground">
            ⌘K
          </kbd>
        </button>
        <button
          type="button"
          onClick={() => setTemplatesOpen(true)}
          className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LayoutTemplate className="size-3.5" />
          Templates
        </button>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <CircleHelp className="size-3.5" />
          Help
        </button>
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
        onLoadInputSample={() => setInputText(SAMPLE_INPUT)}
        onLoadDslSample={loadDslSample}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
      />

      <main className="grid min-h-0 flex-1 overflow-hidden grid-cols-1 md:grid-cols-3 md:grid-rows-[minmax(0,1fr)]">
        {/* Input panel */}
        <section className="flex min-h-0 flex-col overflow-hidden border-b md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Input JSON
            </h2>
            <button
              type="button"
              onClick={() => setInputText(SAMPLE_INPUT)}
              className="rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Load sample
            </button>
          </div>
          <JsonDropzone
            onImport={setInputText}
            hintVisible={inputText.trim() === ""}
          >
            <LineNumberTextarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handleInputPaste}
              spellCheck={false}
              placeholder='{ "user": { "name": "Ada" } }'
            />
          </JsonDropzone>
          {detectedFields.length > 0 && (
            <div className="flex max-h-[45%] min-h-0 flex-col border-t">
              <p className="border-b px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Detected fields
              </p>
              <div className="min-h-0 overflow-auto">
                <FileTree
                  data={detectedFieldTreeData}
                  variant="ghost"
                  size="sm"
                  defaultExpanded={true}
                  aria-label="Detected fields"
                  className="px-2 py-1.5"
                  getIcon={(node) =>
                    node.type === "file" ? (
                      <File className="size-3 shrink-0 text-muted-foreground" />
                    ) : null
                  }
                  renderTrailing={(node) => {
                    if (!isFieldNodeMeta(node.meta)) return null;
                    const { fieldNode, arrayContext } = node.meta;
                    const mapping = mappingFor(fieldNode, arrayContext);

                    return (
                      <>
                        <span className="rounded bg-muted px-1 py-px text-[9px] uppercase tracking-wide text-muted-foreground/80">
                          {fieldTypeLabel(fieldNode)}
                        </span>
                        {mapping ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMapField(mapping);
                            }}
                            title={
                              mapping.operation === "map"
                                ? `Map array ${mapping.source}${mapping.select ? ` -> ${mapping.select}` : ""}`
                                : `Map field ${mapping.source}`
                            }
                            className="ml-auto hidden items-center gap-0.5 rounded border px-1 py-px text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground group-hover:flex"
                          >
                            <Plus className="size-2.5" />
                            map
                          </button>
                        ) : null}
                      </>
                    );
                  }}
                />
              </div>
            </div>
          )}
          {result.inputError && (
            <ErrorBanner
              title={result.inputError.title}
              detail={result.inputError.detail}
            />
          )}
        </section>

        {/* Transform panel */}
        <section className="flex min-h-0 flex-col overflow-hidden border-b md:border-b-0 md:border-r">
          <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Transform
            </h2>
            <div className="flex items-center gap-1.5">
              <div className="flex rounded-md border p-0.5">
                <TabButton
                  active={editorMode === "builder"}
                  onClick={() => switchMode("builder")}
                >
                  Builder
                </TabButton>
                <TabButton
                  active={editorMode === "dsl"}
                  onClick={() => switchMode("dsl")}
                >
                  DSL
                </TabButton>
              </div>
              <button
                type="button"
                onClick={loadDslSample}
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
              itemFields={(arrayPath) =>
                itemFieldsFor(parsedInputForHints, arrayPath)
              }
              rowErrors={rowErrors}
              onChange={handleRowsChange}
            />
          ) : (
            <textarea
              value={dslText}
              onChange={(e) => setDslText(e.target.value)}
              spellCheck={false}
              placeholder='{ "fullName": "$user.first + \u0027 \u0027 + $user.last" }'
              className="h-0 min-h-0 flex-1 resize-none overflow-auto bg-transparent p-3 font-mono text-xs leading-relaxed outline-none placeholder:text-muted-foreground/50"
            />
          )}

          {builderNotice && (
            <div className="shrink-0 border-t bg-amber-500/10 px-3 py-2">
              <p className="font-mono text-[11px] text-amber-200/90">
                {builderNotice}
              </p>
            </div>
          )}
          {result.dslError && (
            <ErrorBanner
              title={result.dslError.title}
              detail={result.dslError.detail}
            />
          )}
        </section>

        {/* Output panel */}
        <section className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Output
            </h2>
            <CopyButton
              value={result.output ?? ""}
              disabled={result.output == null}
              size="xs"
              variant="outline"
              copiedText="Copied"
              className="text-xs text-muted-foreground"
              onCopied={() => {
                if (result.output == null) return;
                trackOutputCopied({
                  output_length: result.output.length,
                  warning_count: result.warnings.length,
                });
              }}
            />
          </div>
          <LineNumberPre
            value={result.output}
            emptyMessage="Fix the errors on the left to see output."
          />
          {result.warnings.length > 0 && (
            <div className="max-h-32 overflow-auto border-t bg-amber-500/10 px-3 py-2">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-amber-500">
                Warnings
              </p>
              <ul className="space-y-1">
                {groupedWarnings.map(([field, warnings]) => (
                  <li key={field}>
                    <p className="font-mono text-[11px] font-semibold text-amber-400">
                      {field}
                    </p>
                    <ul className="space-y-0.5 pl-3">
                      {warnings.map((w, i) => (
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
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded px-2 py-0.5 text-xs bg-accent text-accent-foreground"
          : "rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-accent-foreground"
      }
    >
      {children}
    </button>
  );
}

function ErrorBanner({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="shrink-0 border-t bg-destructive/10 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-destructive">
        {title}
      </p>
      <p className="mt-0.5 font-mono text-[11px] text-destructive/90">
        {detail}
      </p>
    </div>
  );
}
