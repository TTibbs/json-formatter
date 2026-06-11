"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { FieldNode } from "@json-transformer/core";

export interface FieldMapping {
  outputKey: string;
  operation: "path" | "map";
  source: string;
  /** Map only: item-relative select ("" = whole item). */
  select?: string;
}

interface FieldTreeProps {
  fields: FieldNode[];
  onMap: (mapping: FieldMapping) => void;
}

/** Collapsible tree of detected input fields with click-to-map actions. */
export function FieldTree({ fields, onMap }: FieldTreeProps) {
  if (fields.length === 0) {
    return (
      <p className="px-3 py-2 text-[11px] text-muted-foreground/60">
        No fields detected — paste valid JSON above.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5 px-2 py-1.5">
      {fields.map((node) => (
        <TreeNode key={node.path || node.key} node={node} depth={0} onMap={onMap} />
      ))}
    </ul>
  );
}

interface TreeNodeProps {
  node: FieldNode;
  depth: number;
  onMap: (mapping: FieldMapping) => void;
  /**
   * Set when this node lives inside an array: the array's absolute source
   * path plus the item-relative prefix accumulated through nested arrays.
   */
  arrayContext?: { source: string; relPrefix: string };
}

function TreeNode({ node, depth, onMap, arrayContext }: TreeNodeProps) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = !!node.children && node.children.length > 0;
  const mapping = mappingFor(node, arrayContext);

  return (
    <li>
      <div
        className="group flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent/50"
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Collapse" : "Expand"}
            className="text-muted-foreground/70 hover:text-foreground"
          >
            {open ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </button>
        ) : (
          <span className="w-3" />
        )}

        <span className="font-mono text-[11px] text-foreground/90">
          {node.key}
        </span>
        <TypeBadge node={node} />

        {mapping && (
          <button
            type="button"
            onClick={() => onMap(mapping)}
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
        )}
      </div>

      {open && hasChildren && (
        <ul className="space-y-0.5">
          {node.children!.map((child) => (
            <TreeNode
              key={`${node.path}/${child.path || child.key}`}
              node={child}
              depth={depth + 1}
              onMap={onMap}
              arrayContext={childArrayContext(node, arrayContext)}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Decide what clicking "map" on this node should create. */
function mappingFor(
  node: FieldNode,
  ctx?: { source: string; relPrefix: string },
): FieldMapping | null {
  if (ctx) {
    // Inside an array: everything maps via the array source.
    if (node.kind === "object") return null;
    const select =
      node.kind === "array"
        ? `${ctx.relPrefix}${node.path}[]`
        : `${ctx.relPrefix}${node.path}`;
    return {
      outputKey: node.key,
      operation: "map",
      source: ctx.source,
      select,
    };
  }

  if (node.kind === "array") {
    if (!node.path) return null; // root array — not addressable
    return { outputKey: node.key, operation: "map", source: node.path, select: "" };
  }

  if (node.kind === "value") {
    return { outputKey: node.key, operation: "path", source: node.path };
  }

  return null; // plain objects expand rather than map
}

function childArrayContext(
  node: FieldNode,
  ctx?: { source: string; relPrefix: string },
): { source: string; relPrefix: string } | undefined {
  if (node.kind === "array") {
    if (ctx) {
      // Nested array: extend the item-relative prefix ("lines[].").
      return { source: ctx.source, relPrefix: `${ctx.relPrefix}${node.path}[].` };
    }
    return node.path
      ? { source: node.path, relPrefix: "" }
      : undefined; // root array children aren't mappable
  }
  return ctx;
}

function TypeBadge({ node }: { node: FieldNode }) {
  const label =
    node.kind === "array"
      ? node.valueType
        ? `${node.valueType}[]`
        : "array"
      : node.kind === "object"
        ? "object"
        : (node.valueType ?? "value");

  return (
    <span className="rounded bg-muted px-1 py-px text-[9px] uppercase tracking-wide text-muted-foreground/80">
      {label}
    </span>
  );
}
