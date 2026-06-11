/**
 * Resolve a dot/index path (`user.name`, `items[0].price`) against an input
 * value. Returns `undefined` for any missing segment. Never throws.
 */
export function resolvePath(input: unknown, path: string): unknown {
  if (typeof path !== "string" || path.length === 0) return undefined;

  const segments = parsePath(path);
  if (segments.length === 0) return undefined;

  let current: unknown = input;

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

function parsePath(path: string): string[] {
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
}

function isIndex(seg: string): boolean {
  return /^\d+$/.test(seg);
}
