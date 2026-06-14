import { normalize } from "./dsl/normalize";
import { evaluateTransform } from "./evaluator/index";
import { extractPipeline, normalizePipeline } from "./pipeline/normalize";
import { runPipeline } from "./pipeline/run";
import type { JsonValue, RawDsl, TransformResult } from "./types/index";

export type {
  ArrayNode,
  BinaryExpr,
  BinaryOp,
  ConditionNode,
  Context,
  Expr,
  ExpressionNode,
  ForeachStep,
  JsonValue,
  LiteralExpr,
  LiteralNode,
  MapNode,
  MoveStep,
  Node,
  ObjectNode,
  PathExpr,
  PathNode,
  PipelineStep,
  RawDsl,
  RemoveStep,
  RenameStep,
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
export { normalizePipeline, extractPipeline } from "./pipeline/normalize";
export { runPipeline } from "./pipeline/run";

// Schema inference: field tree for visual mapping UIs.
export {
  inferFields,
  type FieldKind,
  type FieldNode,
  type FieldValueType,
} from "./schema/fields";

function isEmptyObject(value: JsonValue): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  );
}

function cloneJson(value: unknown): JsonValue {
  return structuredClone(value) as JsonValue;
}

/**
 * The public API: transform `input` JSON using a declarative `dsl`.
 *
 * Deterministic and error-safe — never throws. Missing paths and invalid
 * expressions produce `null`, invalid array sources produce `[]`, and all
 * problems are reported in `errors`.
 *
 * When the DSL includes `$pipeline`, structural steps run on a deep clone
 * of the input before the output-shaping phase.
 */
export function transform(input: unknown, dsl: RawDsl): TransformResult {
  try {
    const { pipeline: rawPipeline, outputDsl } = extractPipeline(dsl);
    const allErrors: TransformResult["errors"] = [];

    let workingInput: unknown = input;

    if (rawPipeline !== undefined) {
      const { steps, errors: pipelineNormalizeErrors } =
        normalizePipeline(rawPipeline);
      allErrors.push(...pipelineNormalizeErrors);

      if (steps.length > 0) {
        const cloned = cloneJson(input);
        const { document, errors: pipelineRunErrors } = runPipeline(
          cloned,
          steps,
        );
        allErrors.push(...pipelineRunErrors);
        workingInput = document;
      }

      if (isEmptyObject(outputDsl)) {
        return { output: workingInput as JsonValue, errors: allErrors };
      }
    }

    const { node, errors: normalizeErrors } = normalize(outputDsl);
    const { output, errors: evalErrors } = evaluateTransform(
      node,
      workingInput,
    );
    return {
      output,
      errors: [...allErrors, ...normalizeErrors, ...evalErrors],
    };
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
