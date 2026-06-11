import { normalize } from "./dsl/normalize";
import { evaluateTransform } from "./evaluator/index";
import type { RawDsl, TransformResult } from "./types/index";

export type {
  ArrayNode,
  BinaryExpr,
  BinaryOp,
  ConditionNode,
  Context,
  Expr,
  ExpressionNode,
  JsonValue,
  LiteralExpr,
  LiteralNode,
  MapNode,
  Node,
  ObjectNode,
  PathExpr,
  PathNode,
  RawDsl,
  Transform,
  TransformError,
  TransformErrorType,
  TransformResult,
} from "./types/index";

// Authoring API: the typed Node AST is the canonical mapping model.
// `normalize` parses shorthand DSL into it; `serializeNode` is the inverse.
export { normalize, type NormalizeResult } from "./dsl/normalize";
export { serializeNode } from "./dsl/serialize";
export { parseExpression } from "./parser/expression";

// Schema inference: field tree for visual mapping UIs.
export {
  inferFields,
  type FieldKind,
  type FieldNode,
  type FieldValueType,
} from "./schema/fields";

/**
 * The public API: transform `input` JSON using a declarative `dsl`.
 *
 * Deterministic and error-safe — never throws. Missing paths and invalid
 * expressions produce `null`, invalid array sources produce `[]`, and all
 * problems are reported in `errors`.
 */
export function transform(input: unknown, dsl: RawDsl): TransformResult {
  try {
    const { node, errors: normalizeErrors } = normalize(dsl);
    const { output, errors: evalErrors } = evaluateTransform(node, input);
    return { output, errors: [...normalizeErrors, ...evalErrors] };
  } catch (err) {
    return {
      output: null,
      errors: [
        {
          type: "DSL_INVALID",
          message: err instanceof Error ? err.message : "Transform failed",
        },
      ],
    };
  }
}
