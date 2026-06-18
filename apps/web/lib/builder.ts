import {
  extractSort,
  normalize,
  parseExpression,
  serializeNode,
  type ConditionNode,
  type Expr,
  type JsonValue,
  type Node,
  type ObjectNode,
} from "@json-transformer/core";

export type OutputKeyOrder =
  | "none"
  | "root-alphabetical"
  | "deep-alphabetical"
  | "array-alphabetical";

export interface OutputSortSettings {
  order: OutputKeyOrder;
  /** Output field key when order === "array-alphabetical" */
  arrayField?: string;
}

export const DEFAULT_OUTPUT_SORT_SETTINGS: OutputSortSettings = {
  order: "none",
};

export function arraySortCandidates(rows: BuilderRow[]): string[] {
  return rows
    .filter(
      (row) =>
        row.operation === "map" &&
        row.select.trim() === "" &&
        row.outputKey.trim() !== "",
    )
    .map((row) => row.outputKey.trim());
}

export function parseSortSettings(
  dsl: Record<string, JsonValue>,
): OutputSortSettings & { unsupported?: boolean } {
  const { sort } = extractSort(dsl);

  if (sort === undefined) {
    return { order: "none" };
  }

  if (sort === "alphabetical") {
    return { order: "root-alphabetical" };
  }

  if (typeof sort === "object" && sort !== null && !Array.isArray(sort)) {
    const obj = sort as Record<string, JsonValue>;

    if (obj.deep === true) {
      return { order: "deep-alphabetical" };
    }

    const at = obj.at;

    if (typeof at === "string" && at.endsWith("[]")) {
      const field = at.slice(0, -2);
      if (field.length > 0) {
        return { order: "array-alphabetical", arrayField: field };
      }
    }

    return { order: "none", unsupported: true };
  }

  return { order: "none", unsupported: true };
}

export function applySortSettings(
  dsl: Record<string, JsonValue>,
  settings: OutputSortSettings,
): Record<string, JsonValue> {
  const { outputDsl } = extractSort(dsl);
  const base =
    typeof outputDsl === "object" &&
    outputDsl !== null &&
    !Array.isArray(outputDsl)
      ? { ...(outputDsl as Record<string, JsonValue>) }
      : {};

  if (settings.order === "none") {
    return base;
  }

  if (settings.order === "root-alphabetical") {
    return { $sort: "alphabetical", ...base };
  }

  if (settings.order === "deep-alphabetical") {
    return { $sort: { deep: true }, ...base };
  }

  if (settings.order === "array-alphabetical" && settings.arrayField) {
    return {
      $sort: { at: `${settings.arrayField}[]` },
      ...base,
    };
  }

  return base;
}

export type BuilderOperation =
  | "path"
  | "expression"
  | "map"
  | "literal"
  | "concat"
  | "condition";

export type ConditionComparator =
  | "=="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "truthy"
  | "falsy";

export interface BuilderRow {
  id: string;
  outputKey: string;
  operation: BuilderOperation;
  /** Map field: source path. Compute: expression. Map array: array source. */
  source: string;
  /** Map array only: item field ("" = the item itself). */
  select: string;
  /** Fixed value only: raw text (number/boolean auto-detected). */
  value: string;
  /** Concat only: field paths to join. */
  parts: string[];
  /** Concat only: separator text. */
  separator: string;
  /** Condition only. */
  condField: string;
  condOp: ConditionComparator;
  condValue: string;
  thenValue: string;
  elseValue: string;
}

let nextId = 0;

export function newRow(partial: Partial<BuilderRow> = {}): BuilderRow {
  return {
    id: `row-${nextId++}`,
    outputKey: "",
    operation: "path",
    source: "",
    select: "",
    value: "",
    parts: ["", ""],
    separator: " ",
    condField: "",
    condOp: "==",
    condValue: "",
    thenValue: "",
    elseValue: "",
    ...partial,
  };
}

/**
 * Build the canonical Node AST from builder rows.
 * Rows with empty output keys are skipped.
 */
export function rowsToNode(rows: BuilderRow[]): ObjectNode {
  const entries: Record<string, Node> = {};

  for (const row of rows) {
    const key = row.outputKey.trim();
    if (!key) continue;
    entries[key] = rowToNode(row);
  }

  return { type: "object", entries };
}

const NULL_LITERAL: Node = { type: "literal", value: null };

function rowToNode(row: BuilderRow): Node {
  switch (row.operation) {
    case "path":
      // An incomplete row (no source picked yet) maps to null output
      // instead of an unserializable empty path.
      if (row.source === "") return NULL_LITERAL;
      return { type: "path", value: row.source };

    case "expression":
      return expressionNode(row.source);

    case "map":
      if (row.source === "") return NULL_LITERAL;
      return {
        type: "map",
        source: row.source,
        select: { type: "path", value: row.select },
      };

    case "literal":
      return { type: "literal", value: parseLiteral(row.value) };

    case "concat":
      return concatToNode(row);

    case "condition":
      return conditionToNode(row);
  }
}

function expressionNode(source: string): Node {
  return {
    type: "expression",
    source,
    // The AST here is only needed to satisfy the node shape while the
    // user types; serialization uses `source`, and evaluation re-parses
    // (reporting INVALID_EXPRESSION as a warning if still broken).
    ast: tryParseExpression(source),
  };
}

function tryParseExpression(source: string): Expr {
  try {
    return parseExpression(source);
  } catch {
    return { type: "literal", value: null };
  }
}

function parseLiteral(raw: string): string | number | boolean | null {
  const trimmed = raw.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  return raw;
}

// --- Concat -----------------------------------------------------------

function concatToNode(row: BuilderRow): Node {
  const parts = row.parts.map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return NULL_LITERAL;
  if (parts.length === 1 && !row.separator) {
    return { type: "path", value: parts[0] };
  }

  // Single quotes can't be escaped in the expression grammar.
  const sep = row.separator.replace(/'/g, "");
  const joiner = sep ? ` + '${sep}' + ` : " + ";
  const source = parts.map((p) => `$${p}`).join(joiner);
  return expressionNode(source);
}

/**
 * Detect `$a + 'sep' + $b (+ 'sep' + $c)*` chains (or bare `$a + $b`)
 * and recover the Concat row shape.
 */
function exprToConcat(
  expr: Expr,
): { parts: string[]; separator: string } | null {
  const terms: Expr[] = [];
  flattenPlus(expr, terms);
  if (terms.length < 2) return null;

  const parts: string[] = [];
  const seps: string[] = [];

  for (let i = 0; i < terms.length; i++) {
    const term = terms[i];

    if (term.type === "path") {
      parts.push(term.value);
      continue;
    }
    if (
      term.type === "literal" &&
      typeof term.value === "string" &&
      i > 0 &&
      i < terms.length - 1
    ) {
      seps.push(term.value);
      continue;
    }
    return null;
  }

  // Valid shapes: all paths (separator ""), or alternating with one
  // consistent separator between every pair.
  if (seps.length === 0) return { parts, separator: "" };
  if (
    seps.length === parts.length - 1 &&
    seps.every((s) => s === seps[0])
  ) {
    return { parts, separator: seps[0] };
  }
  return null;
}

function flattenPlus(expr: Expr, out: Expr[]) {
  if (expr.type === "binary" && expr.op === "+") {
    flattenPlus(expr.left, out);
    flattenPlus(expr.right, out);
    return;
  }
  out.push(expr);
}

// --- Condition --------------------------------------------------------

function conditionToNode(row: BuilderRow): Node {
  const field = row.condField.trim();
  if (!field) return NULL_LITERAL;

  let ifSource: string;
  switch (row.condOp) {
    case "truthy":
      ifSource = `$${field}`;
      break;
    case "falsy":
      ifSource = `$${field} == false`;
      break;
    default: {
      const value = parseLiteral(row.condValue);
      const literal =
        typeof value === "string" ? `'${value.replace(/'/g, "")}'` : String(value);
      ifSource = `$${field} ${row.condOp} ${literal}`;
    }
  }

  return {
    type: "condition",
    if: tryParseExpression(ifSource),
    ifSource,
    then: valueOrPathNode(row.thenValue),
    else: valueOrPathNode(row.elseValue),
  };
}

/** Branch values: path-looking strings map, everything else is literal. */
function valueOrPathNode(raw: string): Node {
  if (raw.includes(".") || raw.includes("[")) {
    return { type: "path", value: raw };
  }
  return { type: "literal", value: parseLiteral(raw) };
}

function conditionToRow(key: string, node: ConditionNode): BuilderRow | null {
  const thenValue = branchValue(node.then);
  const elseValue = branchValue(node.else);
  if (thenValue === null || elseValue === null) return null;

  const cond = node.if;

  if (cond.type === "path") {
    return newRow({
      outputKey: key,
      operation: "condition",
      condField: cond.value,
      condOp: "truthy",
      thenValue,
      elseValue,
    });
  }

  if (cond.type === "binary" && cond.left.type === "path" && cond.right.type === "literal") {
    if (cond.op === "==" && cond.right.value === false) {
      return newRow({
        outputKey: key,
        operation: "condition",
        condField: cond.left.value,
        condOp: "falsy",
        thenValue,
        elseValue,
      });
    }
    if (["==", "!=", ">", "<", ">=", "<="].includes(cond.op)) {
      return newRow({
        outputKey: key,
        operation: "condition",
        condField: cond.left.value,
        condOp: cond.op as ConditionComparator,
        condValue:
          typeof cond.right.value === "string"
            ? cond.right.value
            : String(cond.right.value),
        thenValue,
        elseValue,
      });
    }
  }

  return null;
}

function branchValue(node: Node): string | null {
  if (node.type === "path") return node.value;
  if (node.type === "literal") {
    return typeof node.value === "string" ? node.value : String(node.value);
  }
  return null;
}

// --- Serialization API --------------------------------------------------

/** Serialize builder rows into a DSL object via the core AST. */
export function rowsToDsl(
  rows: BuilderRow[],
  sortSettings: OutputSortSettings = DEFAULT_OUTPUT_SORT_SETTINGS,
): Record<string, JsonValue> {
  const dsl = serializeNode(rowsToNode(rows)) as Record<string, JsonValue>;
  return applySortSettings(dsl, sortSettings);
}

/**
 * Flatten a normalized top-level ObjectNode into builder rows.
 * Returns null for shapes the flat builder can't represent
 * (nested objects, DSL arrays, nested map selects).
 */
export function nodeToRows(node: Node): BuilderRow[] | null {
  if (node.type !== "object") return null;

  const rows: BuilderRow[] = [];

  for (const [key, child] of Object.entries(node.entries)) {
    const row = nodeToRow(key, child);
    if (row === null) return null;
    rows.push(row);
  }

  return rows;
}

function nodeToRow(key: string, node: Node): BuilderRow | null {
  switch (node.type) {
    case "path":
      return newRow({ outputKey: key, operation: "path", source: node.value });

    case "expression": {
      // A pure path reference ($version, $user.age) is a Map field row.
      if (node.ast.type === "path") {
        return newRow({
          outputKey: key,
          operation: "path",
          source: node.ast.value,
        });
      }
      // Concat chains restore the structured Concat row.
      const concat = exprToConcat(node.ast);
      if (concat) {
        return newRow({
          outputKey: key,
          operation: "concat",
          parts: concat.parts,
          separator: concat.separator,
        });
      }
      return newRow({
        outputKey: key,
        operation: "expression",
        source: node.source,
      });
    }

    case "map":
      if (node.select.type !== "path") return null;
      return newRow({
        outputKey: key,
        operation: "map",
        source: node.source,
        select: node.select.value,
      });

    case "condition":
      return conditionToRow(key, node);

    case "literal":
      return newRow({
        outputKey: key,
        operation: "literal",
        value:
          typeof node.value === "string" ? node.value : String(node.value),
      });

    default:
      // Nested objects / arrays — not representable in the flat builder.
      return null;
  }
}

/**
 * Parse DSL text into builder rows and sort settings.
 * Returns null when the text is invalid JSON, contains invalid expressions,
 * or uses shapes the flat builder can't represent.
 */
export function dslToBuilder(dslText: string): {
  rows: BuilderRow[];
  sortSettings: OutputSortSettings;
  unsupportedSort?: boolean;
} | null {
  let dsl: unknown;
  try {
    dsl = JSON.parse(dslText);
  } catch {
    return null;
  }

  if (typeof dsl !== "object" || dsl === null || Array.isArray(dsl)) {
    return null;
  }

  const dslObj = dsl as Record<string, JsonValue>;
  const sortParsed = parseSortSettings(dslObj);
  const { outputDsl } = extractSort(dslObj);

  const { node, errors } = normalize(outputDsl as never);
  if (errors.length > 0) return null;

  const rows = nodeToRows(node);
  if (rows === null) return null;

  return {
    rows,
    sortSettings: {
      order: sortParsed.order,
      arrayField: sortParsed.arrayField,
    },
    unsupportedSort: sortParsed.unsupported,
  };
}

/**
 * Parse DSL text into builder rows via core's `normalize`.
 * Returns null when the text is invalid JSON, contains invalid expressions
 * (kept in the DSL tab rather than silently mangled), or uses shapes the
 * flat builder can't represent.
 */
export function dslToRows(dslText: string): BuilderRow[] | null {
  const parsed = dslToBuilder(dslText);
  return parsed?.rows ?? null;
}
