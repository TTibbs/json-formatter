import { getAtPath, setAtPath } from "../parser/path-mutate";
import type { JsonValue, SortOrder, TransformError } from "../types/index";
import type { SortConfig } from "../graph/types";

export type AtPathSegment =
  | { type: "property"; name: string }
  | { type: "arrayEach" };

/** Parse an output walk path such as `users[]` or `orders[].lines[]`. */
export function parseAtPath(path: string): AtPathSegment[] {
  const segments: AtPathSegment[] = [];

  for (const part of path.split(".")) {
    if (part.length === 0) continue;

    if (part.endsWith("[]")) {
      const name = part.slice(0, -2);
      if (name) segments.push({ type: "property", name });
      segments.push({ type: "arrayEach" });
    } else {
      segments.push({ type: "property", name: part });
    }
  }

  return segments;
}

export function sortObjectKeysAlphabetically(
  obj: Record<string, JsonValue>,
): Record<string, JsonValue> {
  const sorted: Record<string, JsonValue> = {};
  for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b))) {
    sorted[key] = obj[key]!;
  }
  return sorted;
}

type PrimitiveJsonType = "string" | "number" | "boolean" | "null";

function primitiveJsonType(value: JsonValue): PrimitiveJsonType | "other" {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "other";
}

function comparePrimitiveJson(a: JsonValue, b: JsonValue): number {
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b);
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }
  return 0;
}

function canSortPrimitiveArray(values: JsonValue[]): boolean {
  if (values.length === 0) return true;

  const types = new Set(values.map(primitiveJsonType));
  if (types.has("other")) return false;

  const nonNull = [...types].filter((type) => type !== "null");
  return nonNull.length <= 1;
}

/** Recursively sort object keys and homogeneous primitive array elements. */
export function sortDeepAlphabetically(value: JsonValue): JsonValue {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    const processed = value.map(sortDeepAlphabetically);
    if (!canSortPrimitiveArray(processed)) {
      return processed;
    }
    return [...processed].sort(comparePrimitiveJson);
  }

  const obj = value as Record<string, JsonValue>;
  const sorted: Record<string, JsonValue> = {};
  for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b))) {
    sorted[key] = sortDeepAlphabetically(obj[key]!);
  }
  return sorted;
}

function sortValueIfObject(
  value: JsonValue,
  errors: TransformError[],
  nodeId: string,
  path: string,
): JsonValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    errors.push({
      type: "TYPE_MISMATCH",
      message: "Expected an object to sort keys",
      path,
      nodeId,
    });
    return value;
  }

  return sortObjectKeysAlphabetically(value as Record<string, JsonValue>);
}

/** Sort keys of an object at `path` within `doc` (empty path = root). */
export function sortAtPath(
  doc: Record<string, JsonValue>,
  path: string | undefined,
  errors: TransformError[],
  nodeId: string,
): JsonValue {
  if (!path || path.length === 0) {
    return sortObjectKeysAlphabetically(doc);
  }

  const target = getAtPath(doc, path);
  if (target === undefined) {
    errors.push({
      type: "PATH_NOT_FOUND",
      message: `Path "${path}" not found`,
      path,
      nodeId,
    });
    return doc;
  }

  const sorted = sortValueIfObject(target as JsonValue, errors, nodeId, path);
  if (sorted === target) return doc;

  const clone = structuredClone(doc) as Record<string, JsonValue>;
  const setResult = setAtPath(clone, path, sorted);
  if (!setResult.ok) {
    errors.push({
      type: "TYPE_MISMATCH",
      message: `Cannot sort keys at path "${path}"`,
      path,
      nodeId,
    });
    return doc;
  }

  return clone;
}

function applyAtSegments(
  value: JsonValue,
  segments: AtPathSegment[],
  errors: TransformError[],
  nodeId: string,
  pathSoFar: string,
): JsonValue {
  if (segments.length === 0) {
    return sortValueIfObject(value, errors, nodeId, pathSoFar);
  }

  const [head, ...rest] = segments;

  if (head!.type === "property") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      errors.push({
        type: "TYPE_MISMATCH",
        message: `Expected an object at "${pathSoFar}"`,
        path: pathSoFar,
        nodeId,
      });
      return value;
    }

    const obj = value as Record<string, JsonValue>;
    const child = obj[head!.name];
    if (child === undefined) {
      errors.push({
        type: "PATH_NOT_FOUND",
        message: `Path "${pathSoFar ? `${pathSoFar}.${head!.name}` : head!.name}" not found`,
        path: pathSoFar ? `${pathSoFar}.${head!.name}` : head!.name,
        nodeId,
      });
      return value;
    }

    const nextPath = pathSoFar ? `${pathSoFar}.${head!.name}` : head!.name;
    const sortedChild = applyAtSegments(child, rest, errors, nodeId, nextPath);
    if (sortedChild === child) return value;

    return { ...structuredClone(obj), [head!.name]: sortedChild };
  }

  if (!Array.isArray(value)) {
    errors.push({
      type: "TYPE_MISMATCH",
      message: `Expected an array at "${pathSoFar}"`,
      path: pathSoFar,
      nodeId,
    });
    return value;
  }

  let changed = false;
  const next = value.map((item, i) => {
    const sorted = applyAtSegments(
      item as JsonValue,
      rest,
      errors,
      nodeId,
      `${pathSoFar}[${i}]`,
    );
    if (sorted !== item) changed = true;
    return sorted;
  });

  return changed ? next : value;
}

/** Walk output JSON and sort object keys at `atPath` (e.g. `users[]`). */
export function walkAndSortAt(
  output: JsonValue,
  atPath: string,
  errors: TransformError[],
  nodeId: string,
): JsonValue {
  const segments = parseAtPath(atPath);
  if (segments.length === 0) {
    return sortValueIfObject(output, errors, nodeId, "");
  }

  return applyAtSegments(output, segments, errors, nodeId, "");
}

export function applySortConfig(
  input: JsonValue,
  config: SortConfig,
  errors: TransformError[],
  nodeId: string,
): JsonValue {
  if (config.order !== "alphabetical") {
    errors.push({
      type: "DSL_INVALID",
      message: `Unsupported sort order "${config.order as string}"`,
      nodeId,
    });
    return input;
  }

  if (config.deep) {
    return sortDeepAlphabetically(structuredClone(input));
  }

  if (config.at) {
    return walkAndSortAt(input, config.at, errors, nodeId);
  }

  const root = asSortableRecord(input, nodeId, errors);
  if (!root) return input;

  return sortAtPath(root, config.path, errors, nodeId);
}

function asSortableRecord(
  value: JsonValue,
  nodeId: string,
  errors: TransformError[],
): Record<string, JsonValue> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    errors.push({
      type: "TYPE_MISMATCH",
      message: "Expected an object document",
      nodeId,
    });
    return null;
  }
  return structuredClone(value) as Record<string, JsonValue>;
}

export function parseSortDirective(
  raw: unknown,
  errors: TransformError[],
  fieldPath: string,
): SortConfig | null {
  if (raw === "alphabetical") {
    return { order: "alphabetical" };
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    errors.push({
      type: "DSL_INVALID",
      message: 'Sort must be "alphabetical" or an object with optional "path" / "at"',
      outputField: fieldPath,
    });
    return null;
  }

  const obj = raw as Record<string, unknown>;
  const order = obj.order;
  const deep = obj.deep === true;
  const path = typeof obj.path === "string" ? obj.path : undefined;
  const at = typeof obj.at === "string" ? obj.at : undefined;

  if (order !== undefined && order !== "alphabetical") {
    errors.push({
      type: "DSL_INVALID",
      message: `Unsupported sort order "${String(order)}"`,
      outputField: fieldPath,
    });
    return null;
  }

  if (deep && at) {
    errors.push({
      type: "DSL_INVALID",
      message: '"deep" cannot be combined with "at"',
      outputField: fieldPath,
    });
    return null;
  }

  if (deep && path) {
    errors.push({
      type: "DSL_INVALID",
      message: '"deep" cannot be combined with "path"',
      outputField: fieldPath,
    });
    return null;
  }

  if (deep) {
    return { order: "alphabetical", deep: true };
  }

  if (!path && !at && order === undefined) {
    errors.push({
      type: "DSL_INVALID",
      message: 'Sort object must include "alphabetical" order, "path", "at", or "deep"',
      outputField: fieldPath,
    });
    return null;
  }

  if (path !== undefined && path.length === 0) {
    errors.push({
      type: "DSL_INVALID",
      message: '"path" must be a non-empty string',
      outputField: fieldPath,
    });
    return null;
  }

  if (at !== undefined && at.length === 0) {
    errors.push({
      type: "DSL_INVALID",
      message: '"at" must be a non-empty string',
      outputField: fieldPath,
    });
    return null;
  }

  return { order: "alphabetical", path, at };
}
