"use client";

import { JsonDropzone } from "@/components/json-dropzone";
import { LineNumberTextarea } from "@/components/line-number-textarea";
import { ErrorBanner } from "@/components/ui/error-banner";
import type { FieldMapping } from "@/lib/field-mapping";
import type { PanelError } from "@/types/types";
import { DetectedFields } from "./detected-fields";

interface InputPanelProps {
  inputText: string;
  onInputChange: (value: string) => void;
  onLoadSample: () => void;
  onInputPaste: React.ClipboardEventHandler<HTMLTextAreaElement>;
  parsedInput: unknown;
  onMapField: (mapping: FieldMapping) => void;
  inputError: PanelError;
}

export function InputPanel({
  inputText,
  onInputChange,
  onLoadSample,
  onInputPaste,
  parsedInput,
  onMapField,
  inputError,
}: InputPanelProps) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden border-b md:border-b-0 md:border-r">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Input JSON
        </h2>
        <button
          type="button"
          onClick={onLoadSample}
          className="rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Load sample
        </button>
      </div>
      <JsonDropzone
        onImport={onInputChange}
        hintVisible={inputText.trim() === ""}
      >
        <LineNumberTextarea
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          onPaste={onInputPaste}
          spellCheck={false}
          placeholder='{ "user": { "name": "Ada" } }'
        />
      </JsonDropzone>
      <DetectedFields parsedInput={parsedInput} onMapField={onMapField} />
      {inputError && (
        <ErrorBanner title={inputError.title} detail={inputError.detail} />
      )}
    </section>
  );
}
