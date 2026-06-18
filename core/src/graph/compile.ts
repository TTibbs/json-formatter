import { normalize } from "../dsl/normalize";
import { extractPipeline, extractSort, normalizePipeline } from "../pipeline/normalize";
import { parseSortDirective } from "../sort/index";
import type {
  JsonValue,
  PipelineStep,
  RawDsl,
  TransformError,
} from "../types/index";
import type {
  CompileResult,
  GraphEdge,
  GraphNode,
  SortConfig,
  TransformGraph,
} from "./types";

let graphCounter = 0;

function nextId(prefix: string): string {
  graphCounter++;
  return `${prefix}_${graphCounter}`;
}

function isEmptyObject(value: JsonValue): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  );
}

function compileBodySteps(
  steps: PipelineStep[],
  prefix: string,
): { nodes: GraphNode[]; bodyIds: string[] } {
  const nodes: GraphNode[] = [];
  const bodyIds: string[] = [];

  for (const step of steps) {
    if (step.type === "foreach") {
      const inner = compileBodySteps(step.steps, nextId(`${prefix}_f`));
      const mapId = nextId(`${prefix}_map`);
      nodes.push(...inner.nodes);
      nodes.push({
        id: mapId,
        type: "map",
        config: { source: step.source, body: inner.bodyIds },
      });
      bodyIds.push(mapId);
      continue;
    }

    if (step.type === "move") {
      const id = nextId(`${prefix}_nest`);
      nodes.push({
        id,
        type: "nest",
        config: { from: step.from, to: step.to },
      });
      bodyIds.push(id);
      continue;
    }

    if (step.type === "rename") {
      const id = nextId(`${prefix}_rename`);
      nodes.push({
        id,
        type: "rename",
        config: { map: { [step.from]: step.to } },
      });
      bodyIds.push(id);
      continue;
    }

    if (step.type === "remove") {
      const id = nextId(`${prefix}_remove`);
      nodes.push({
        id,
        type: "remove",
        config: { paths: [step.path] },
      });
      bodyIds.push(id);
      continue;
    }

    if (step.type === "sort") {
      const id = nextId(`${prefix}_sort`);
      nodes.push({
        id,
        type: "sort",
        config: { order: step.order, path: step.path, deep: step.deep },
      });
      bodyIds.push(id);
    }
  }

  return { nodes, bodyIds };
}

function compileTopLevelStep(
  step: PipelineStep,
  prefix: string,
): { nodes: GraphNode[]; flowNodeId: string } {
  if (step.type === "foreach") {
    const inner = compileBodySteps(step.steps, prefix);
    const mapId = nextId(`${prefix}_map`);
    return {
      nodes: [
        ...inner.nodes,
        {
          id: mapId,
          type: "map",
          config: { source: step.source, body: inner.bodyIds },
        },
      ],
      flowNodeId: mapId,
    };
  }

  if (step.type === "move") {
    const id = nextId(`${prefix}_nest`);
    return {
      nodes: [{ id, type: "nest", config: { from: step.from, to: step.to } }],
      flowNodeId: id,
    };
  }

  if (step.type === "rename") {
    const id = nextId(`${prefix}_rename`);
    return {
      nodes: [
        {
          id,
          type: "rename",
          config: { map: { [step.from]: step.to } },
        },
      ],
      flowNodeId: id,
    };
  }

  if (step.type === "remove") {
    const id = nextId(`${prefix}_remove`);
    return {
      nodes: [{ id, type: "remove", config: { paths: [step.path] } }],
      flowNodeId: id,
    };
  }

  return compileSortTopLevelStep(
    { order: step.order, path: step.path, deep: step.deep },
    prefix,
  );
}

function compileSortTopLevelStep(
  config: SortConfig,
  prefix: string,
): { nodes: GraphNode[]; flowNodeId: string } {
  const id = nextId(`${prefix}_sort`);
  return {
    nodes: [{ id, type: "sort", config }],
    flowNodeId: id,
  };
}

/**
 * Compile legacy RawDsl (output DSL + optional $pipeline) into a TransformGraph.
 */
export function compileToGraph(dsl: RawDsl): CompileResult {
  graphCounter = 0;
  const errors: TransformError[] = [];

  const inputId = "input";
  const outputId = "output";

  const nodes: GraphNode[] = [
    { id: inputId, type: "input" },
    { id: outputId, type: "output" },
  ];
  const edges: GraphEdge[] = [];

  const { pipeline: rawPipeline, outputDsl: afterPipeline } = extractPipeline(dsl);
  const { sort: rawSort, outputDsl } = extractSort(afterPipeline);
  let flowTail = inputId;

  if (rawPipeline !== undefined) {
    const { steps, errors: pipelineErrors } = normalizePipeline(rawPipeline);
    errors.push(...pipelineErrors);

    for (const step of steps) {
      const compiled = compileTopLevelStep(step, "p");
      nodes.push(...compiled.nodes);
      edges.push({ from: flowTail, to: compiled.flowNodeId });
      flowTail = compiled.flowNodeId;
    }
  }

  if (!isEmptyObject(outputDsl)) {
    const { node, errors: normalizeErrors } = normalize(outputDsl);
    errors.push(...normalizeErrors);

    const projectId = "project";
    nodes.push({
      id: projectId,
      type: "project",
      config: { root: node },
    });
    edges.push({ from: flowTail, to: projectId });
    flowTail = projectId;
  }

  if (rawSort !== undefined) {
    const sortConfig = parseSortDirective(rawSort, errors, "$sort");
    if (sortConfig) {
      const compiled = compileSortTopLevelStep(sortConfig, "s");
      nodes.push(...compiled.nodes);
      edges.push({ from: flowTail, to: compiled.flowNodeId });
      flowTail = compiled.flowNodeId;
    }
  }

  edges.push({ from: flowTail, to: outputId });

  const graph: TransformGraph = {
    id: "compiled",
    version: 2,
    nodes,
    edges,
  };

  return { graph, errors };
}

/** Build a minimal input → project → output graph from a normalized Node tree. */
export function graphFromProjectNode(root: import("../types/index").Node): TransformGraph {
  return {
    id: "project-only",
    version: 2,
    nodes: [
      { id: "input", type: "input" },
      { id: "project", type: "project", config: { root } },
      { id: "output", type: "output" },
    ],
    edges: [
      { from: "input", to: "project" },
      { from: "project", to: "output" },
    ],
  };
}
