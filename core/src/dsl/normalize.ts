import { parseExpression } from "../parser/expression";
import type { JsonValue, Node, RawDsl, TransformError } from "../types/index";

export interface NormalizeResult {
  node: Node;
  errors: TransformError[];
}

/**
 * Convert shorthand DSL into the strict internal node format.
 *
 * - "$user.age > 18"            -> ExpressionNode
 * - "users[].email"             -> MapNode { source: "users", select: ... }
 * - "user.name"                 -> PathNode (string contains `.` or `[`)
 * - { if, then, else? }         -> ConditionNode
 * - other primitives            -> LiteralNode
 * - plain objects               -> ObjectNode (recursive)
 *
 * Never throws: invalid expressions become `null` literals and are
 * reported in `errors`, attributed to the output field they belong to.
 */
export function normalize(raw: RawDsl): NormalizeResult {
  const errors: TransformError[] = [];
  const node = normalizeValue(raw, errors, "");
  return { node, errors };
}

function normalizeValue(
  value: RawDsl,
  errors: TransformError[],
  outPath: string,
): Node {
  if (typeof value === "string") {
    return normalizeString(value, errors, outPath);
  }

  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return { type: "literal", value };
  }

  if (Array.isArray(value)) {
    return {
      type: "array",
      items: value.map((v, i) =>
        normalizeValue(v, errors, `${outPath}[${i}]`),
      ),
    };
  }

  if (typeof value === "object") {
    const condition = tryNormalizeCondition(value, errors, outPath);
    if (condition) return condition;

    const entries: Record<string, Node> = {};
    for (const [key, child] of Object.entries(value)) {
      entries[key] = normalizeValue(
        child as JsonValue,
        errors,
        outPath ? `${outPath}.${key}` : key,
      );
    }
    return { type: "object", entries };
  }

  // Unsupported value (undefined, function, etc.) — degrade to null.
  errors.push({
    type: "DSL_INVALID",
    message: `Unsupported DSL value of type ${typeof value}`,
    outputField: outPath || undefined,
  });
  return { type: "literal", value: null };
}

/**
 * `{ "if": "...", "then": ..., "else"?: ... }` is the conditional shape.
 * Only objects with exactly these keys are treated as conditions; anything
 * else stays a plain ObjectNode.
 */
function tryNormalizeCondition(
  value: object,
  errors: TransformError[],
  outPath: string,
): Node | null {
  const keys = Object.keys(value);
  const allowed = keys.every((k) => k === "if" || k === "then" || k === "else");
  if (!allowed || !keys.includes("if") || !keys.includes("then")) return null;

  const raw = value as { if: unknown; then: RawDsl; else?: RawDsl };
  if (typeof raw.if !== "string") {
    errors.push({
      type: "DSL_INVALID",
      message: '"if" must be an expression string',
      outputField: outPath || undefined,
    });
    return { type: "literal", value: null };
  }

  // Allow both "$user.active" and bare path "user.active" as the condition.
  const ifSource = raw.if.startsWith("$") ? raw.if : `$${raw.if}`;

  try {
    const ast = parseExpression(ifSource);
    return {
      type: "condition",
      if: ast,
      ifSource: raw.if,
      then: normalizeValue(raw.then, errors, outPath),
      else:
        raw.else === undefined
          ? { type: "literal", value: null }
          : normalizeValue(raw.else, errors, outPath),
    };
  } catch (err) {
    errors.push({
      type: "INVALID_EXPRESSION",
      message: err instanceof Error ? err.message : "Invalid condition",
      path: raw.if,
      outputField: outPath || undefined,
    });
    return { type: "literal", value: null };
  }
}

function normalizeString(
  value: string,
  errors: TransformError[],
  outPath: string,
  /** True when normalizing a map select, where bare names are item paths. */
  isMapSelect = false,
): Node {
  // Expression: starts with `$`
  if (value.startsWith("$")) {
    try {
      const ast = parseExpression(value);
      return { type: "expression", source: value, ast };
    } catch (err) {
      errors.push({
        type: "INVALID_EXPRESSION",
        message: err instanceof Error ? err.message : "Invalid expression",
        path: value,
        outputField: outPath || undefined,
      });
      return { type: "literal", value: null };
    }
  }

  // Array map shorthand: "users[].email" -> map(users, email)
  const mapMatch = value.match(/^([^[\]]+)\[\]\.?(.*)$/);
  if (mapMatch) {
    const [, source, select] = mapMatch;
    return {
      type: "map",
      source,
      // Empty select ("users[]") means "the item itself".
      select: select
        ? normalizeString(select, errors, outPath, true)
        : { type: "path", value: "" },
    };
  }

  // Path: contains a dot or bracket access. Inside a map select, bare
  // names ("email") are paths relative to the item rather than literals.
  if (isMapSelect || value.includes(".") || value.includes("[")) {
    return { type: "path", value };
  }

  // Anything else is a literal string
  return { type: "literal", value };
}
