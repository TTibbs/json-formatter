"use client";

import { ArrowDownAZ } from "lucide-react";
import type { BuilderRow, OutputSortSettings } from "@/lib/builder";
import { arraySortCandidates } from "@/lib/builder";

export type SortOptionValue =
  | "none"
  | "root-alphabetical"
  | "deep-alphabetical"
  | `array:${string}`;

function toOptionValue(settings: OutputSortSettings): SortOptionValue {
  if (settings.order === "root-alphabetical") return "root-alphabetical";
  if (settings.order === "deep-alphabetical") return "deep-alphabetical";
  if (settings.order === "array-alphabetical" && settings.arrayField) {
    return `array:${settings.arrayField}`;
  }
  return "none";
}

function fromOptionValue(value: SortOptionValue): OutputSortSettings {
  if (value === "root-alphabetical") {
    return { order: "root-alphabetical" };
  }
  if (value === "deep-alphabetical") {
    return { order: "deep-alphabetical" };
  }
  if (value.startsWith("array:")) {
    return {
      order: "array-alphabetical",
      arrayField: value.slice("array:".length),
    };
  }
  return { order: "none" };
}

interface OutputSortToolbarProps {
  sortSettings: OutputSortSettings;
  rows: BuilderRow[];
  onSortSettingsChange: (settings: OutputSortSettings) => void;
}

export function OutputSortToolbar({
  sortSettings,
  rows,
  onSortSettingsChange,
}: OutputSortToolbarProps) {
  const candidates = arraySortCandidates(rows);
  const selected = toOptionValue(sortSettings);
  const isSorted = sortSettings.order !== "none";
  const isDeepSort = sortSettings.order === "deep-alphabetical";

  function toggleQuickSort() {
    if (isSorted) {
      onSortSettingsChange({ order: "none" });
      return;
    }
    onSortSettingsChange({ order: "root-alphabetical" });
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/20 px-3 py-2">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Key order
      </label>
      <select
        value={selected}
        onChange={(e) =>
          onSortSettingsChange(fromOptionValue(e.target.value as SortOptionValue))
        }
        className="rounded-md border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-ring"
      >
        <option value="none">As defined</option>
        <option value="root-alphabetical">Top-level A-Z</option>
        <option value="deep-alphabetical">All levels A-Z</option>
        {candidates.map((field) => (
          <option key={field} value={`array:${field}`}>
            Inside &quot;{field}&quot; items A-Z
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={toggleQuickSort}
        className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
          isSorted
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
        title={isSorted ? "Restore field order" : "Sort top-level keys A-Z"}
      >
        <ArrowDownAZ className="size-3.5" />
        Sort A-Z
      </button>
      {isSorted && (
        <span className="text-[11px] text-muted-foreground/80">
          {isDeepSort
            ? "Keys and values will be sorted at every level"
            : "Keys will be sorted in the output"}
        </span>
      )}
    </div>
  );
}
