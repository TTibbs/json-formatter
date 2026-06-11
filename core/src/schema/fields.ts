export type FieldKind = "object" | "array" | "value";

export type FieldValueType = "string" | "number" | "boolean" | "null" | "mixed";

export interface FieldNode {
  /** Last segment ("first"). */
  key: string;
  /**
   * Path usable in a mapping. Absolute ("user.first") except for children
   * of an array node, whose paths are relative to each item ("email") —
   * exactly what a map select needs.
   */
  path: string;
  kind: FieldKind;
  /** Set for value nodes and scalar arrays; "mixed" when samples disagree. */
  valueType?: FieldValueType;
  children?: FieldNode[];
}

const MAX_DEPTH = 8;
const MAX_NODES = 500;
const ARRAY_SAMPLE = 20;

interface Budget {
  remaining: number;
}

/**
 * Infer a field tree from parsed input JSON for visual mapping.
 * Arrays are sampled (up to 20 items) and item shapes merged, so
 * heterogeneous arrays surface the union of their fields.
 */
export function inferFields(input: unknown): FieldNode[] {
  const budget: Budget = { remaining: MAX_NODES };

  if (Array.isArray(input)) {
    // A root-level array has no addressable path in the DSL; surface its
    // merged item shape for discoverability (path "" disables mapping).
    return [arrayNode("(root array)", "", input, 0, budget)];
  }

  if (input !== null && typeof input === "object") {
    return objectChildren(input as Record<string, unknown>, "", 0, budget);
  }

  return [];
}

function objectChildren(
  obj: Record<string, unknown>,
  basePath: string,
  depth: number,
  budget: Budget,
): FieldNode[] {
  if (depth >= MAX_DEPTH) return [];

  const children: FieldNode[] = [];
  for (const key of Object.keys(obj)) {
    if (budget.remaining <= 0) break;
    const path = basePath ? `${basePath}.${key}` : key;
    children.push(fieldFor(key, path, obj[key], depth, budget));
  }
  return children;
}

function fieldFor(
  key: string,
  path: string,
  value: unknown,
  depth: number,
  budget: Budget,
): FieldNode {
  budget.remaining--;

  if (Array.isArray(value)) {
    return arrayNode(key, path, value, depth, budget);
  }

  if (value !== null && typeof value === "object") {
    return {
      key,
      path,
      kind: "object",
      children: objectChildren(
        value as Record<string, unknown>,
        path,
        depth + 1,
        budget,
      ),
    };
  }

  return { key, path, kind: "value", valueType: scalarType(value) };
}

function arrayNode(
  key: string,
  path: string,
  arr: unknown[],
  depth: number,
  budget: Budget,
): FieldNode {
  const samples = arr.slice(0, ARRAY_SAMPLE);
  const node: FieldNode = { key, path, kind: "array" };

  if (samples.length === 0 || depth >= MAX_DEPTH) return node;

  if (samples.every((s) => s !== null && typeof s === "object" && !Array.isArray(s))) {
    // Item-relative paths: children restart from "".
    node.children = mergedObjectChildren(
      samples as Record<string, unknown>[],
      "",
      depth + 1,
      budget,
    );
    return node;
  }

  if (samples.every((s) => s === null || typeof s !== "object")) {
    node.valueType = mergeTypes(samples.map(scalarType));
    return node;
  }

  node.valueType = "mixed";
  return node;
}

/** Union of keys across sampled items, with merged types per key. */
function mergedObjectChildren(
  samples: Record<string, unknown>[],
  basePath: string,
  depth: number,
  budget: Budget,
): FieldNode[] {
  if (depth >= MAX_DEPTH) return [];

  const keys: string[] = [];
  for (const sample of samples) {
    for (const key of Object.keys(sample)) {
      if (!keys.includes(key)) keys.push(key);
    }
  }

  const children: FieldNode[] = [];
  for (const key of keys) {
    if (budget.remaining <= 0) break;
    const path = basePath ? `${basePath}.${key}` : key;
    const values = samples
      .filter((s) => key in s)
      .map((s) => s[key]);
    children.push(mergedField(key, path, values, depth, budget));
  }
  return children;
}

function mergedField(
  key: string,
  path: string,
  values: unknown[],
  depth: number,
  budget: Budget,
): FieldNode {
  budget.remaining--;

  if (values.every((v) => Array.isArray(v))) {
    const flat = (values as unknown[][]).flat().slice(0, ARRAY_SAMPLE);
    return arrayNode(key, path, flat, depth, budget);
  }

  if (
    values.every(
      (v) => v !== null && typeof v === "object" && !Array.isArray(v),
    )
  ) {
    return {
      key,
      path,
      kind: "object",
      children: mergedObjectChildren(
        values as Record<string, unknown>[],
        path,
        depth + 1,
        budget,
      ),
    };
  }

  if (values.every((v) => v === null || typeof v !== "object")) {
    return { key, path, kind: "value", valueType: mergeTypes(values.map(scalarType)) };
  }

  return { key, path, kind: "value", valueType: "mixed" };
}

function scalarType(value: unknown): FieldValueType {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "mixed";
}

function mergeTypes(types: FieldValueType[]): FieldValueType {
  const unique = [...new Set(types)];
  return unique.length === 1 ? unique[0] : "mixed";
}
