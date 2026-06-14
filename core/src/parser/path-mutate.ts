import type { JsonValue } from "../types/index";
import { isIndex, parsePath } from "./path";

export type MutateResult =
  | { ok: true }
  | { ok: false; reason: "PATH_NOT_FOUND" | "STRUCTURAL_CONFLICT" | "INVALID_TARGET" };

/** Read a value at a dot/bracket path. Returns undefined if missing. */
export function getAtPath(root: unknown, path: string): unknown {
  if (typeof path !== "string" || path.length === 0) return undefined;

  const segments = parsePath(path);
  if (segments.length === 0) return undefined;

  let current: unknown = root;

  for (const seg of segments) {
    if (current == null) return undefined;

    if (Array.isArray(current)) {
      if (!isIndex(seg)) return undefined;
      current = current[Number(seg)];
      continue;
    }

    if (typeof current !== "object") return undefined;

    current = (current as Record<string, unknown>)[seg];
  }

  return current;
}

/** Set a value at a path, creating intermediate objects as needed. */
export function setAtPath(
  root: Record<string, JsonValue>,
  path: string,
  value: JsonValue,
): MutateResult {
  if (typeof path !== "string" || path.length === 0) {
    return { ok: false, reason: "INVALID_TARGET" };
  }

  const segments = parsePath(path);
  if (segments.length === 0) return { ok: false, reason: "INVALID_TARGET" };

  let current: JsonValue = root;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    const next = segments[i + 1]!;

    if (Array.isArray(current)) {
      if (!isIndex(seg)) return { ok: false, reason: "INVALID_TARGET" };
      const idx = Number(seg);
      const existing = current[idx];
      if (existing == null || typeof existing !== "object" || Array.isArray(existing)) {
        current[idx] = isIndex(next) ? [] : {};
      }
      current = current[idx] as JsonValue;
      continue;
    }

    if (typeof current !== "object" || current === null) {
      return { ok: false, reason: "INVALID_TARGET" };
    }

    const obj = current as Record<string, JsonValue>;
    const existing = obj[seg];
    if (existing == null || typeof existing !== "object" || Array.isArray(existing)) {
      obj[seg] = isIndex(next) ? [] : {};
    }
    current = obj[seg] as JsonValue;
  }

  const last = segments[segments.length - 1]!;

  if (Array.isArray(current)) {
    if (!isIndex(last)) return { ok: false, reason: "INVALID_TARGET" };
    current[Number(last)] = value;
    return { ok: true };
  }

  if (typeof current !== "object" || current === null) {
    return { ok: false, reason: "INVALID_TARGET" };
  }

  (current as Record<string, JsonValue>)[last] = value;
  return { ok: true };
}

/** Delete a value at a path. Returns PATH_NOT_FOUND if the path does not exist. */
export function deleteAtPath(
  root: Record<string, JsonValue>,
  path: string,
): MutateResult {
  if (typeof path !== "string" || path.length === 0) {
    return { ok: false, reason: "PATH_NOT_FOUND" };
  }

  const segments = parsePath(path);
  if (segments.length === 0) return { ok: false, reason: "PATH_NOT_FOUND" };

  if (segments.length === 1) {
    const key = segments[0]!;
    if (!(key in root)) return { ok: false, reason: "PATH_NOT_FOUND" };
    delete root[key];
    return { ok: true };
  }

  let current: unknown = root;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    if (current == null) return { ok: false, reason: "PATH_NOT_FOUND" };

    if (Array.isArray(current)) {
      if (!isIndex(seg)) return { ok: false, reason: "PATH_NOT_FOUND" };
      current = current[Number(seg)];
      continue;
    }

    if (typeof current !== "object") return { ok: false, reason: "PATH_NOT_FOUND" };

    current = (current as Record<string, unknown>)[seg];
  }

  const last = segments[segments.length - 1]!;

  if (current == null) return { ok: false, reason: "PATH_NOT_FOUND" };

  if (Array.isArray(current)) {
    if (!isIndex(last)) return { ok: false, reason: "PATH_NOT_FOUND" };
    const idx = Number(last);
    if (idx >= current.length) return { ok: false, reason: "PATH_NOT_FOUND" };
    current.splice(idx, 1);
    return { ok: true };
  }

  if (typeof current !== "object") return { ok: false, reason: "PATH_NOT_FOUND" };

  const obj = current as Record<string, JsonValue>;
  if (!(last in obj)) return { ok: false, reason: "PATH_NOT_FOUND" };
  delete obj[last];
  return { ok: true };
}

/**
 * Move a value from one path to another within the same object tree.
 * Fails with STRUCTURAL_CONFLICT if `to` already exists.
 */
export function moveAtPath(
  root: Record<string, JsonValue>,
  from: string,
  to: string,
): MutateResult {
  const value = getAtPath(root, from);
  if (value === undefined) return { ok: false, reason: "PATH_NOT_FOUND" };

  const existing = getAtPath(root, to);
  if (existing !== undefined) return { ok: false, reason: "STRUCTURAL_CONFLICT" };

  const setResult = setAtPath(root, to, value as JsonValue);
  if (!setResult.ok) return setResult;

  return deleteAtPath(root, from);
}
