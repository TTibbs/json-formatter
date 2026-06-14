import { transformViaGraph } from "./graph/index";
import type { RawDsl, TransformResult } from "./types/index";

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

export { normalize, type NormalizeResult } from "./dsl/normalize";
export { serializeNode } from "./dsl/serialize";
export { parseExpression } from "./parser/expression";
export { normalizePipeline, extractPipeline } from "./pipeline/normalize";
export { runPipeline } from "./pipeline/run";

export {
  compileToGraph,
  compileDslToGraph,
  executeGraph,
  graphFromProjectNode,
  runGraph,
  validateGraph,
  topologicalSort,
  transformViaGraph,
} from "./graph/index";

export type {
  CompileResult,
  ConditionConfig,
  FlattenConfig,
  GraphEdge,
  GraphNode,
  GraphNodeConfig,
  GraphNodeType,
  GraphValidationResult,
  MapConfig,
  NestConfig,
  PickConfig,
  ProjectConfig,
  RemoveConfig,
  RenameConfig,
  TransformGraph,
} from "./graph/index";

export {
  inferFields,
  type FieldKind,
  type FieldNode,
  type FieldValueType,
} from "./schema/fields";

/**
 * Transform input JSON using declarative DSL.
 * Compiles to a graph internally — the graph engine is the single runtime.
 */
export function transform(input: unknown, dsl: RawDsl): TransformResult {
  try {
    return transformViaGraph(input, dsl);
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
