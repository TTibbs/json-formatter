import { compileToGraph, graphFromProjectNode } from "./compile";
import { runGraph } from "./execute";
import type { CompileResult, TransformGraph } from "./types";
import { topologicalSort, validateGraph } from "./validate";
import type { RawDsl, TransformResult } from "../types/index";

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
} from "./types";

export { compileToGraph, graphFromProjectNode } from "./compile";
export { runGraph } from "./execute";
export { topologicalSort, validateGraph } from "./validate";

export function executeGraph(
  input: unknown,
  graph: TransformGraph,
): TransformResult {
  return runGraph(input, graph);
}

export function transformViaGraph(
  input: unknown,
  dsl: RawDsl,
): TransformResult {
  const { graph, errors: compileErrors } = compileToGraph(dsl);
  const result = runGraph(input, graph);
  return {
    output: result.output,
    errors: [...compileErrors, ...result.errors],
  };
}

export { compileToGraph as compileDslToGraph };
