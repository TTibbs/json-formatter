import { evaluateMap } from "../transforms/map";
import { resolvePath } from "../parser/path";
import { evaluateExpression } from "./expression";
import type {
  Context,
  JsonValue,
  Node,
  TransformError,
} from "../types/index";

/**
 * Evaluate a normalized node tree against an input value.
 * Never throws: failures degrade to null / [] and are recorded in `errors`,
 * each attributed to the output field being produced.
 */
export function evaluateTransform(
  node: Node,
  input: unknown,
): { output: JsonValue; errors: TransformError[] } {
  const errors: TransformError[] = [];
  const output = evaluateNode(node, { root: input, current: input }, errors, "");
  return { output, errors };
}

export function evaluateNode(
  node: Node,
  context: Context,
  errors: TransformError[],
  outPath: string,
): JsonValue {
  switch (node.type) {
    case "literal":
      return node.value;

    case "object": {
      const result: Record<string, JsonValue> = {};
      for (const [key, child] of Object.entries(node.entries)) {
        result[key] = evaluateNode(
          child,
          context,
          errors,
          outPath ? `${outPath}.${key}` : key,
        );
      }
      return result;
    }

    case "array":
      return node.items.map((item, i) =>
        evaluateNode(item, context, errors, `${outPath}[${i}]`),
      );

    case "path": {
      // Empty path means "the current value itself" (e.g. `users[]`).
      if (node.value === "") return toJson(context.current);
      const resolved = resolvePath(context.current, node.value);
      if (resolved === undefined) {
        errors.push({
          type: "PATH_NOT_FOUND",
          message: `Path "${node.value}" not found`,
          path: node.value,
          outputField: outPath || undefined,
        });
        return null;
      }
      return toJson(resolved);
    }

    case "expression": {
      try {
        const value = evaluateExpression(node.ast, context);
        return value === undefined ? null : toJson(value);
      } catch (err) {
        errors.push({
          type: "INVALID_EXPRESSION",
          message: err instanceof Error ? err.message : "Expression failed",
          path: node.source,
          outputField: outPath || undefined,
        });
        return null;
      }
    }

    case "condition": {
      let passed: unknown;
      try {
        passed = evaluateExpression(node.if, context);
      } catch (err) {
        errors.push({
          type: "INVALID_EXPRESSION",
          message: err instanceof Error ? err.message : "Condition failed",
          path: node.ifSource,
          outputField: outPath || undefined,
        });
        return null;
      }
      return evaluateNode(
        passed ? node.then : node.else,
        context,
        errors,
        outPath,
      );
    }

    case "map":
      return evaluateMap(node, context, errors, evaluateNode, outPath);
  }
}

/** Coerce resolved values into JSON-safe output (undefined -> null). */
function toJson(value: unknown): JsonValue {
  if (value === undefined) return null;
  return value as JsonValue;
}
