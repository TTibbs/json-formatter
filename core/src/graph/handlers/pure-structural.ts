import {
  deleteAtPath,
  getAtPath,
  moveAtPath,
  setAtPath,
  type MutateResult,
} from "../../parser/path-mutate";
import {
  applySortConfig,
  sortDeepAlphabetically,
  sortObjectKeysAlphabetically,
} from "../../sort/index";
import type {
  JsonValue,
  TransformError,
  TransformErrorType,
} from "../../types/index";
import type {
  FlattenConfig,
  NestConfig,
  RemoveConfig,
  RenameConfig,
  SortConfig,
} from "../types";

function cloneRecord(value: JsonValue): Record<string, JsonValue> {
  return structuredClone(value) as Record<string, JsonValue>;
}

function asRecord(
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
  return value as Record<string, JsonValue>;
}

function recordMutateError(
  result: Extract<MutateResult, { ok: false }>,
  nodeId: string,
  path: string,
  errors: TransformError[],
): void {
  errors.push({
    type: result.reason as TransformErrorType,
    message:
      result.reason === "PATH_NOT_FOUND"
        ? `Path "${path}" not found`
        : result.reason === "STRUCTURAL_CONFLICT"
          ? `Target path "${path}" already exists`
          : `Invalid path "${path}"`,
    path,
    nodeId,
  });
}

export function applyRenamePure(
  input: JsonValue,
  config: RenameConfig,
  nodeId: string,
  errors: TransformError[],
): JsonValue {
  const root = asRecord(input, nodeId, errors);
  if (!root) return input;

  const doc = cloneRecord(root);
  for (const [from, to] of Object.entries(config.map)) {
    const result = moveAtPath(doc, from, to);
    if (!result.ok) recordMutateError(result, nodeId, from, errors);
  }
  return doc;
}

export function applyNestPure(
  input: JsonValue,
  config: NestConfig,
  nodeId: string,
  errors: TransformError[],
): JsonValue {
  const root = asRecord(input, nodeId, errors);
  if (!root) return input;

  const doc = cloneRecord(root);
  const result = moveAtPath(doc, config.from, config.to);
  if (!result.ok) recordMutateError(result, nodeId, config.from, errors);
  return doc;
}

export function applyRemovePure(
  input: JsonValue,
  config: RemoveConfig,
  nodeId: string,
  errors: TransformError[],
): JsonValue {
  const root = asRecord(input, nodeId, errors);
  if (!root) return input;

  const doc = cloneRecord(root);
  for (const path of config.paths) {
    const result = deleteAtPath(doc, path);
    if (!result.ok) recordMutateError(result, nodeId, path, errors);
  }
  return doc;
}

export function applyFlattenPure(
  input: JsonValue,
  config: FlattenConfig,
  nodeId: string,
  errors: TransformError[],
): JsonValue {
  const root = asRecord(input, nodeId, errors);
  if (!root) return input;

  const doc = cloneRecord(root);
  for (const [outKey, sourcePath] of Object.entries(config.mappings)) {
    const value = getAtPath(doc, sourcePath);
    if (value === undefined) {
      errors.push({
        type: "PATH_NOT_FOUND",
        message: `Path "${sourcePath}" not found`,
        path: sourcePath,
        nodeId,
      });
      continue;
    }
    doc[outKey] = value as JsonValue;
  }
  return doc;
}

export function applySortPure(
  input: JsonValue,
  config: SortConfig,
  nodeId: string,
  errors: TransformError[],
): JsonValue {
  return applySortConfig(input, config, errors, nodeId);
}

/** Apply a structural op to a single scoped item (rename/remove/nest/sort). */
export function applyScopedStructural(
  item: Record<string, JsonValue>,
  nodeType: "rename" | "remove" | "nest" | "sort",
  config: RenameConfig | RemoveConfig | NestConfig | SortConfig,
  nodeId: string,
  errors: TransformError[],
  itemPath: string,
): Record<string, JsonValue> {
  const cloned = structuredClone(item) as Record<string, JsonValue>;

  if (nodeType === "sort") {
    const sortConfig = config as SortConfig;
    if (sortConfig.at) {
      errors.push({
        type: "DSL_INVALID",
        message: '"at" is only valid on top-level $sort',
        nodeId,
        outputField: itemPath,
      });
      return cloned;
    }

    if (sortConfig.deep) {
      return sortDeepAlphabetically(cloned) as Record<string, JsonValue>;
    }

    if (!sortConfig.path || sortConfig.path.length === 0) {
      return sortObjectKeysAlphabetically(cloned);
    }

    const existing = getAtPath(cloned, sortConfig.path);
    if (existing === undefined) {
      errors.push({
        type: "PATH_NOT_FOUND",
        message: `Path "${sortConfig.path}" not found`,
        path: sortConfig.path,
        nodeId,
        outputField: itemPath,
      });
      return cloned;
    }

    if (
      existing === null ||
      typeof existing !== "object" ||
      Array.isArray(existing)
    ) {
      errors.push({
        type: "TYPE_MISMATCH",
        message: `Expected an object at path "${sortConfig.path}"`,
        path: sortConfig.path,
        nodeId,
        outputField: itemPath,
      });
      return cloned;
    }

    const setResult = setAtPath(
      cloned,
      sortConfig.path,
      sortObjectKeysAlphabetically(existing as Record<string, JsonValue>),
    );
    if (!setResult.ok) {
      errors.push({
        type: "TYPE_MISMATCH",
        message: `Cannot sort keys at path "${sortConfig.path}"`,
        path: sortConfig.path,
        nodeId,
        outputField: itemPath,
      });
    }
    return cloned;
  }

  if (nodeType === "rename") {
    for (const [from, to] of Object.entries((config as RenameConfig).map)) {
      const result = moveAtPath(cloned, from, to);
      if (!result.ok) {
        errors.push({
          type: result.reason as TransformErrorType,
          message:
            result.reason === "PATH_NOT_FOUND"
              ? `Path "${from}" not found`
              : result.reason === "STRUCTURAL_CONFLICT"
                ? `Target path "${to}" already exists`
                : `Invalid path "${from}"`,
          path: from,
          nodeId,
          outputField: itemPath,
        });
      }
    }
    return cloned;
  }

  if (nodeType === "remove") {
    for (const path of (config as RemoveConfig).paths) {
      const result = deleteAtPath(cloned, path);
      if (!result.ok) {
        errors.push({
          type: "PATH_NOT_FOUND" as TransformErrorType,
          message: `Path "${path}" not found`,
          path,
          nodeId,
          outputField: itemPath,
        });
      }
    }
    return cloned;
  }

  const nest = config as NestConfig;
  const result = moveAtPath(cloned, nest.from, nest.to);
  if (!result.ok) {
    errors.push({
      type: result.reason as TransformErrorType,
      message:
        result.reason === "PATH_NOT_FOUND"
          ? `Path "${nest.from}" not found`
          : result.reason === "STRUCTURAL_CONFLICT"
            ? `Target path "${nest.to}" already exists`
            : `Invalid path "${nest.from}"`,
      path: nest.from,
      nodeId,
      outputField: itemPath,
    });
  }
  return cloned;
}
