import type { JsonValue, MapNode, Node } from "../types/index";

/**
 * Serialize a normalized Node back into shorthand DSL — the inverse of
 * `normalize` for all representable shapes.
 *
 * Encoding rules:
 * - path with `.`/`[`  -> the path string as-is ("user.name")
 * - bare path          -> `$name` (a plain "name" would re-parse as a
 *                         literal string, so bare names use the `$` form)
 * - expression         -> its original source text
 * - map                -> "source[]" / "source[].select", recursing for
 *                         nested map selects ("a[].b[].c")
 * - literal / object / array -> plain JSON, recursing into children
 *
 * Known lossy case (inherent to the shorthand grammar, unchanged): a
 * literal *string* containing `.` or `[` (e.g. "v1.2") re-parses as a
 * path. Numbers, booleans, and null round-trip exactly.
 */
export function serializeNode(node: Node): JsonValue {
  switch (node.type) {
    case "literal":
      return node.value;

    case "path":
      // "" (the current item) only exists as a map select, where
      // serializeMapSelect handles it; standalone it has no DSL form.
      if (node.value === "") {
        throw new Error("An empty path is only valid as a map select");
      }
      return node.value.includes(".") || node.value.includes("[")
        ? node.value
        : `$${node.value}`;

    case "expression":
      return node.source;

    case "map":
      return serializeMap(node);

    case "condition":
      return {
        if: node.ifSource,
        then: serializeNode(node.then),
        else: serializeNode(node.else),
      };

    case "object": {
      const out: Record<string, JsonValue> = {};
      for (const [key, child] of Object.entries(node.entries)) {
        out[key] = serializeNode(child);
      }
      return out;
    }

    case "array":
      return node.items.map(serializeNode);
  }
}

function serializeMap(node: MapNode): string {
  const select = serializeMapSelect(node.select);
  return select ? `${node.source}[].${select}` : `${node.source}[]`;
}

/**
 * Map selects are restricted by the shorthand grammar to paths and nested
 * maps; "" means "the item itself".
 */
function serializeMapSelect(select: Node): string {
  if (select.type === "path") {
    return select.value;
  }
  if (select.type === "map") {
    return serializeMap(select);
  }
  throw new Error(
    `Map select of type "${select.type}" cannot be expressed in shorthand DSL`,
  );
}
