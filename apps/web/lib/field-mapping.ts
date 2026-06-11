import type { FieldNode } from "@json-transformer/core";
import type { FileTreeNode } from "@/components/ui/file-tree";

export interface FieldMapping {
  outputKey: string;
  operation: "path" | "map";
  source: string;
  /** Map only: item-relative select ("" = whole item). */
  select?: string;
}

export interface FieldNodeMeta {
  fieldNode: FieldNode;
  arrayContext?: { source: string; relPrefix: string };
}

export function isFieldNodeMeta(meta: unknown): meta is FieldNodeMeta {
  return (
    typeof meta === "object" &&
    meta !== null &&
    "fieldNode" in meta &&
    typeof (meta as FieldNodeMeta).fieldNode === "object"
  );
}

export function fieldNodesToFileTree(
  nodes: FieldNode[],
  arrayContext?: { source: string; relPrefix: string },
): FileTreeNode[] {
  return nodes.map((node) => ({
    name: node.key,
    type: node.kind === "value" ? "file" : "folder",
    children: node.children
      ? fieldNodesToFileTree(node.children, childArrayContext(node, arrayContext))
      : undefined,
    meta: { fieldNode: node, arrayContext } satisfies FieldNodeMeta,
  }));
}

/** Decide what clicking "map" on this node should create. */
export function mappingFor(
  node: FieldNode,
  ctx?: { source: string; relPrefix: string },
): FieldMapping | null {
  if (ctx) {
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
    if (!node.path) return null;
    return { outputKey: node.key, operation: "map", source: node.path, select: "" };
  }

  if (node.kind === "value") {
    return { outputKey: node.key, operation: "path", source: node.path };
  }

  return null;
}

function childArrayContext(
  node: FieldNode,
  ctx?: { source: string; relPrefix: string },
): { source: string; relPrefix: string } | undefined {
  if (node.kind === "array") {
    if (ctx) {
      return { source: ctx.source, relPrefix: `${ctx.relPrefix}${node.path}[].` };
    }
    return node.path ? { source: node.path, relPrefix: "" } : undefined;
  }
  return ctx;
}

export function fieldTypeLabel(node: FieldNode): string {
  if (node.kind === "array") {
    return node.valueType ? `${node.valueType}[]` : "array";
  }
  if (node.kind === "object") return "object";
  return node.valueType ?? "value";
}
