import { inferFields, type FieldNode } from "@json-transformer/core";

export type PathKind = "value" | "array" | "object";

export interface PathSuggestion {
  path: string;
  kind: PathKind;
}

/**
 * Flatten core's inferred field tree into datalist suggestions.
 * Children of arrays get sample absolute paths (`users[0].email`) so they
 * are usable as Map field sources.
 */
export function extractPaths(input: unknown): PathSuggestion[] {
  const out: PathSuggestion[] = [];
  walk(inferFields(input), "", out);
  return out;
}

function walk(nodes: FieldNode[], arrayPrefix: string, out: PathSuggestion[]) {
  for (const node of nodes) {
    const abs = arrayPrefix ? `${arrayPrefix}${node.path}` : node.path;
    if (!abs) {
      // Root array placeholder — not addressable, but surface its children.
      if (node.children) walk(node.children, "[0].", out);
      continue;
    }

    if (node.kind === "array") {
      out.push({ path: abs, kind: "array" });
      if (node.children) walk(node.children, `${abs}[0].`, out);
      continue;
    }

    if (node.kind === "object") {
      out.push({ path: abs, kind: "object" });
      if (node.children) walk(node.children, arrayPrefix, out);
      continue;
    }

    out.push({ path: abs, kind: "value" });
  }
}

/**
 * Item-relative field suggestions for a given array source path,
 * e.g. itemFieldsFor(input, "users") -> ["name", "contact.email", ...].
 */
export function itemFieldsFor(input: unknown, arrayPath: string): string[] {
  const arrayNode = findArray(inferFields(input), "", arrayPath);
  if (!arrayNode?.children) return [];

  const fields: string[] = [];
  collectValuePaths(arrayNode.children, fields);
  return fields;
}

function findArray(
  nodes: FieldNode[],
  arrayPrefix: string,
  target: string,
): FieldNode | undefined {
  for (const node of nodes) {
    const abs = arrayPrefix ? `${arrayPrefix}${node.path}` : node.path;
    if (node.kind === "array" && abs === target) return node;
    if (node.children) {
      const prefix = node.kind === "array" ? `${abs}[0].` : arrayPrefix;
      const found = findArray(node.children, prefix, target);
      if (found) return found;
    }
  }
  return undefined;
}

function collectValuePaths(nodes: FieldNode[], out: string[]) {
  for (const node of nodes) {
    if (node.kind === "value") out.push(node.path);
    if (node.kind === "object" && node.children) {
      collectValuePaths(node.children, out);
    }
  }
}
