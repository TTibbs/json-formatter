import type { Context, JsonValue, MapNode, TransformError } from "../types/index";
import { resolvePath } from "../parser/path";

type EvaluateFn = (
  node: MapNode["select"],
  context: Context,
  errors: TransformError[],
  outPath: string,
) => JsonValue;

/**
 * Evaluate a MapNode: resolve `source` to an array and evaluate `select`
 * once per item, with the item as the current context.
 * Non-array sources always produce `[]`.
 */
export function evaluateMap(
  node: MapNode,
  context: Context,
  errors: TransformError[],
  evaluate: EvaluateFn,
  outPath: string,
): JsonValue[] {
  const source = resolvePath(context.current, node.source);

  if (!Array.isArray(source)) {
    if (source !== undefined && source !== null) {
      errors.push({
        type: "TYPE_MISMATCH",
        message: `Map source "${node.source}" is not an array`,
        path: node.source,
        outputField: outPath || undefined,
      });
    }
    return [];
  }

  return source.map((item, i) =>
    evaluate(
      node.select,
      { root: context.root, current: item },
      errors,
      `${outPath}[${i}]`,
    ),
  );
}
