"use client";

import type { GraphNode, GraphNodeType } from "@/lib/graph";

interface NodeConfigPanelProps {
  node: GraphNode;
  allNodeIds: string[];
  onChange: (config: GraphNode["config"]) => void;
}

export function NodeConfigPanel({
  node,
  allNodeIds,
  onChange,
}: NodeConfigPanelProps) {
  if (node.type === "input" || node.type === "output") {
    return (
      <p className="text-xs text-muted-foreground">
        Terminal node — no configuration.
      </p>
    );
  }

  if (node.type === "map") {
    const cfg = (node.config ?? { source: "", body: [] }) as {
      source: string;
      body: string[];
    };
    return (
      <div className="space-y-2">
        <label className="block text-[11px] text-muted-foreground">
          Array source path
          <input
            className="mt-1 w-full rounded border bg-background px-2 py-1 font-mono text-xs"
            value={cfg.source}
            onChange={(e) =>
              onChange({ ...cfg, source: e.target.value })
            }
          />
        </label>
        <label className="block text-[11px] text-muted-foreground">
          Body node ids (comma-separated)
          <input
            className="mt-1 w-full rounded border bg-background px-2 py-1 font-mono text-xs"
            value={cfg.body.join(", ")}
            onChange={(e) =>
              onChange({
                ...cfg,
                body: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <p className="text-[10px] text-muted-foreground">
          Body nodes: {allNodeIds.filter((id) => id !== node.id).join(", ") || "none"}
        </p>
      </div>
    );
  }

  if (node.type === "nest") {
    const cfg = (node.config ?? { from: "", to: "" }) as {
      from: string;
      to: string;
    };
    return (
      <div className="space-y-2">
        <label className="block text-[11px] text-muted-foreground">
          From (item-relative)
          <input
            className="mt-1 w-full rounded border bg-background px-2 py-1 font-mono text-xs"
            value={cfg.from}
            onChange={(e) => onChange({ ...cfg, from: e.target.value })}
          />
        </label>
        <label className="block text-[11px] text-muted-foreground">
          To (nested path)
          <input
            className="mt-1 w-full rounded border bg-background px-2 py-1 font-mono text-xs"
            value={cfg.to}
            onChange={(e) => onChange({ ...cfg, to: e.target.value })}
          />
        </label>
      </div>
    );
  }

  if (node.type === "rename") {
    const cfg = (node.config ?? { map: {} }) as { map: Record<string, string> };
    const entries = Object.entries(cfg.map);
    const from = entries[0]?.[0] ?? "";
    const to = entries[0]?.[1] ?? "";
    return (
      <div className="space-y-2">
        <label className="block text-[11px] text-muted-foreground">
          From
          <input
            className="mt-1 w-full rounded border bg-background px-2 py-1 font-mono text-xs"
            value={from}
            onChange={(e) =>
              onChange({ map: { [e.target.value]: to } })
            }
          />
        </label>
        <label className="block text-[11px] text-muted-foreground">
          To
          <input
            className="mt-1 w-full rounded border bg-background px-2 py-1 font-mono text-xs"
            value={to}
            onChange={(e) =>
              onChange({ map: { [from]: e.target.value } })
            }
          />
        </label>
      </div>
    );
  }

  if (node.type === "remove") {
    const cfg = (node.config ?? { paths: [] }) as { paths: string[] };
    return (
      <label className="block text-[11px] text-muted-foreground">
        Paths to remove (comma-separated)
        <input
          className="mt-1 w-full rounded border bg-background px-2 py-1 font-mono text-xs"
          value={cfg.paths.join(", ")}
          onChange={(e) =>
            onChange({
              paths: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
    );
  }

  if (node.type === "project") {
    return (
      <label className="block text-[11px] text-muted-foreground">
        Project root (JSON Node AST)
        <textarea
          className="mt-1 h-32 w-full resize-none rounded border bg-background px-2 py-1 font-mono text-[11px]"
          value={JSON.stringify(
            (node.config as { root?: unknown })?.root ?? { type: "object", entries: {} },
            null,
            2,
          )}
          onChange={(e) => {
            try {
              onChange({ root: JSON.parse(e.target.value) });
            } catch {
              // ignore while typing
            }
          }}
          spellCheck={false}
        />
      </label>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      Configuration for {node.type} — edit graph JSON in DSL tab for advanced setup.
    </p>
  );
}

export const NODE_TYPE_LABELS: Record<GraphNodeType, string> = {
  input: "Input",
  output: "Output",
  pick: "Pick",
  rename: "Rename",
  remove: "Remove",
  nest: "Nest",
  flatten: "Flatten",
  map: "Map",
  project: "Project",
  condition: "Condition",
};
