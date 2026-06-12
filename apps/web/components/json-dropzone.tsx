"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  trackJsonImportFailed,
  trackJsonImported,
} from "@/lib/analytics";
import {
  isAcceptedJsonFile,
  parseJsonImport,
  readFileAsText,
  type JsonImportMethod,
} from "@/lib/json-import";

type ImportFeedback = {
  kind: "success" | "error";
  title: string;
  detail?: string;
};

export type JsonDropzoneProps = {
  onImport: (rawJson: string) => void;
  hintVisible?: boolean;
  children: React.ReactNode;
};

export function JsonDropzone({
  onImport,
  hintVisible = false,
  children,
}: JsonDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  const [feedback, setFeedback] = useState<ImportFeedback | null>(null);

  useEffect(() => {
    if (feedback?.kind !== "success") return;
    const id = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(id);
  }, [feedback]);

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleBrowseKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFilePicker();
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDragActive(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) void processFile(file, "drop");
  }

  async function processFile(file: File, method: JsonImportMethod) {
    if (!isAcceptedJsonFile(file)) {
      setFeedback({
        kind: "error",
        title: "Only .json files are supported.",
      });
      trackJsonImportFailed({ reason: "invalid_type" });
      return;
    }

    const text = await readFileAsText(file);
    const result = parseJsonImport(text);
    if (!result.ok) {
      setFeedback({
        kind: "error",
        title: "Unable to parse file.",
        detail: "The selected file does not contain valid JSON.",
      });
      trackJsonImportFailed({ reason: "invalid_json" });
      return;
    }

    onImport(result.formatted);
    setFeedback({ kind: "success", title: "JSON imported successfully." });
    trackJsonImported({ method });
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void processFile(file, "browse");
  }

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col border border-dashed transition-colors",
        hintVisible ? "gap-3 border-border/60 bg-muted/10 p-3" : "border-border/60",
        dragActive && "border-primary/50 bg-primary/5",
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={handleFileInputChange}
        tabIndex={-1}
        aria-hidden
      />

      {dragActive && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-primary/5"
          aria-live="polite"
        >
          <p className="rounded-md border border-primary/40 bg-background/90 px-3 py-1.5 text-xs font-medium text-primary">
            Drop JSON file here
          </p>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>

      {hintVisible && (
        <div className="mx-auto w-full max-w-xs shrink-0 rounded-lg border border-border/70 bg-card/60 p-3 text-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:bg-card/40 dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]">
          <p className="text-xs text-muted-foreground">Paste JSON here...</p>
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            or drag a .json file into this area.
          </p>
          <button
            type="button"
            role="button"
            tabIndex={0}
            onClick={openFilePicker}
            onKeyDown={handleBrowseKeyDown}
            className="mt-2.5 rounded-md border bg-background/80 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Browse files
          </button>
        </div>
      )}

      {feedback && (
        <ImportFeedbackBanner feedback={feedback} />
      )}
    </div>
  );
}

function ImportFeedbackBanner({ feedback }: { feedback: ImportFeedback }) {
  const isSuccess = feedback.kind === "success";

  return (
    <div
      className={cn(
        "border-t px-3 py-2",
        isSuccess ? "bg-emerald-500/10" : "bg-destructive/10",
      )}
      role="status"
      aria-live="polite"
    >
      <p
        className={cn(
          "text-[11px] font-medium uppercase tracking-wider",
          isSuccess ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
        )}
      >
        {feedback.title}
      </p>
      {feedback.detail ? (
        <p
          className={cn(
            "mt-0.5 font-mono text-[11px]",
            isSuccess ? "text-emerald-600/90 dark:text-emerald-400/90" : "text-destructive/90",
          )}
        >
          {feedback.detail}
        </p>
      ) : null}
    </div>
  );
}
