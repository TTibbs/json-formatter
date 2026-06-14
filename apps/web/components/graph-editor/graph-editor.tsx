"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { GraphNodeType } from "@json-transformer/core";
import {
  ADDABLE_NODE_TYPES,
  addEdge,
  addNode,
  allNodeIds,
  removeEdge,
  removeNode,
  updateNode,
  type TransformGraph,
} from "@/lib/graph";
import {
  NODE_TYPE_LABELS,
  NodeConfigPanel,
} from "./node-config-panel";

interface GraphEditorProps {
  graph: TransformGraph;
  onChange: (graph: TransformGraph) => void;
}

export function GraphEditor({ graph, onChange }: GraphEditorProps) {
  const defaultActive =
    graph.nodes.find((n) => n.type !== "input" && n.type !== "output")?.id ??
    null;
  const [activeId, setActiveId] = useState<string | null>(defaultActive);

  const ids = allNodeIds(graph);
  const selected = graph.nodes.find((n) => n.id === activeId) ?? null;

  function handleAddNode(type: GraphNodeType) {
    const next = addNode(graph, type);
    const added = next.nodes[next.nodes.length - 1]!;
    onChange(next);
    setActiveId(added.id);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-3">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Nodes
            </h3>
            <select
              className="rounded border bg-background px-2 py-1 text-[11px]"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value as GraphNodeType;
                if (v) handleAddNode(v);
                e.target.value = "";
              }}
            >
              <option value="">Add node…</option>
              {ADDABLE_NODE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <ul className="space-y-1">
            {graph.nodes.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(node.id)}
                  className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-left text-xs transition-colors ${
                    activeId === node.id
                      ? "border-primary/50 bg-primary/10"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <span>
                    <span className="font-mono text-muted-foreground">{node.id}</span>
                    <span className="ml-2 rounded bg-muted px-1 py-0.5 text-[10px] uppercase">
                      {NODE_TYPE_LABELS[node.type]}
                    </span>
                  </span>
                  {node.type !== "input" && node.type !== "output" && (
                    <span
                      role="button"
                      tabIndex={0}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(removeNode(graph, node.id));
                        if (activeId === node.id) setActiveId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          onChange(removeNode(graph, node.id));
                        }
                      }}
                    >
                      <Trash2 className="size-3" />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Edges
          </h3>
          <ul className="mb-2 space-y-1">
            {graph.edges.map((edge, i) => (
              <li
                key={`${edge.from}-${edge.to}-${i}`}
                className="flex items-center gap-1 rounded border px-2 py-1 font-mono text-[11px]"
              >
                <span className="flex-1">
                  {edge.from} → {edge.to}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(removeEdge(graph, i))}
                >
                  <Trash2 className="size-3" />
                </button>
              </li>
            ))}
          </ul>
          <EdgeAdder graph={graph} onChange={onChange} />
        </section>

        {selected && (
          <section className="rounded border bg-card/40 p-3">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Config — {selected.id}
            </h3>
            <NodeConfigPanel
              node={selected}
              allNodeIds={ids}
              onChange={(config) =>
                onChange(updateNode(graph, selected.id, { config }))
              }
            />
          </section>
        )}
      </div>
    </div>
  );
}

function EdgeAdder({
  graph,
  onChange,
}: {
  graph: TransformGraph;
  onChange: (g: TransformGraph) => void;
}) {
  const ids = allNodeIds(graph);
  const [from, setFrom] = useState(ids[0] ?? "");
  const [to, setTo] = useState(ids[1] ?? "");

  return (
    <div className="flex items-end gap-1">
      <label className="flex-1 text-[10px] text-muted-foreground">
        From
        <select
          className="mt-0.5 w-full rounded border bg-background px-1 py-1 font-mono text-[11px]"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        >
          {ids.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <label className="flex-1 text-[10px] text-muted-foreground">
        To
        <select
          className="mt-0.5 w-full rounded border bg-background px-1 py-1 font-mono text-[11px]"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        >
          {ids.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="rounded border p-1.5 text-muted-foreground hover:bg-accent"
        onClick={() => onChange(addEdge(graph, from, to))}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
