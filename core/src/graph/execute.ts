import type { JsonValue, TransformError, TransformResult } from "../types/index";
import { executeMapNode } from "./handlers/map";
import { executePickNode, executeProjectNode } from "./handlers/project";
import {
  applyFlattenPure,
  applyNestPure,
  applyRemovePure,
  applyRenamePure,
  applySortPure,
} from "./handlers/pure-structural";
import type {
  FlattenConfig,
  GraphNode,
  NestConfig,
  PickConfig,
  ProjectConfig,
  RemoveConfig,
  RenameConfig,
  SortConfig,
  TransformGraph,
} from "./types";
import { validateGraph } from "./validate";

export function runGraph(
  input: unknown,
  graph: TransformGraph,
): TransformResult {
  const errors: TransformError[] = [];

  const validation = validateGraph(graph);
  if (!validation.valid) {
    return {
      output: null,
      errors: validation.errors.map((message) => ({
        type: "GRAPH_INVALID" as const,
        message,
      })),
    };
  }

  const bodyOnlyIds = collectBodyOnlyNodeIds(graph);
  const order = getFlowExecutionOrder(graph, bodyOnlyIds);
  if (!order) {
    return {
      output: null,
      errors: [{ type: "GRAPH_INVALID", message: "Graph has a cycle" }],
    };
  }

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const predecessors = buildPredecessors(graph);
  const results = new Map<string, JsonValue>();

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId)!;
    const upstream = predecessors.get(nodeId);
    const nodeInput =
      node.type === "input"
        ? (input as JsonValue)
        : upstream !== undefined
          ? results.get(upstream)
          : undefined;

    if (node.type !== "input" && nodeInput === undefined) {
      errors.push({
        type: "GRAPH_INVALID",
        message: `Node "${nodeId}" has no upstream input`,
        nodeId,
      });
      results.set(nodeId, null);
      continue;
    }

    const output = executeNode(node, nodeInput ?? null, graph, errors);
    results.set(nodeId, output);
  }

  const outputNode = graph.nodes.find((n) => n.type === "output");
  const finalOutput = outputNode
    ? (results.get(outputNode.id) ?? null)
    : null;

  return { output: finalOutput, errors };
}

/** Nodes referenced only as map/condition bodies — not executed on the main edge flow. */
function collectBodyOnlyNodeIds(graph: TransformGraph): Set<string> {
  const referenced = new Set<string>();
  const flowConnected = new Set<string>();

  for (const edge of graph.edges) {
    flowConnected.add(edge.from);
    flowConnected.add(edge.to);
  }

  for (const node of graph.nodes) {
    if (node.type === "map") {
      const body = (node.config as { body?: string[] })?.body ?? [];
      for (const id of body) referenced.add(id);
    }
    if (node.type === "condition") {
      const cfg = node.config as { thenNode?: string; elseNode?: string };
      if (cfg?.thenNode) referenced.add(cfg.thenNode);
      if (cfg?.elseNode) referenced.add(cfg.elseNode);
    }
  }

  const bodyOnly = new Set<string>();
  for (const id of referenced) {
    if (!flowConnected.has(id)) bodyOnly.add(id);
  }
  return bodyOnly;
}

function getFlowExecutionOrder(
  graph: TransformGraph,
  exclude: Set<string>,
): string[] | null {
  const flowNodes = graph.nodes.filter((n) => !exclude.has(n.id));
  const flowIds = new Set(flowNodes.map((n) => n.id));
  const edges = graph.edges.filter(
    (e) => flowIds.has(e.from) && flowIds.has(e.to),
  );

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of flowIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const edge of edges) {
    adj.get(edge.from)?.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const queue = [...flowIds].filter((id) => (inDegree.get(id) ?? 0) === 0);
  const order: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      const deg = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  return order.length === flowIds.size ? order : null;
}

function buildPredecessors(graph: TransformGraph): Map<string, string> {
  const preds = new Map<string, string>();
  for (const edge of graph.edges) {
    preds.set(edge.to, edge.from);
  }
  return preds;
}

function executeNode(
  node: GraphNode,
  nodeInput: JsonValue,
  graph: TransformGraph,
  errors: TransformError[],
): JsonValue {
  switch (node.type) {
    case "input":
      return nodeInput;

    case "output":
      return nodeInput;

    case "pick":
      return executePickNode(
        nodeInput,
        node.config as PickConfig,
        node.id,
        errors,
      );

    case "rename":
      return applyRenamePure(
        nodeInput,
        node.config as RenameConfig,
        node.id,
        errors,
      );

    case "remove":
      return applyRemovePure(
        nodeInput,
        node.config as RemoveConfig,
        node.id,
        errors,
      );

    case "nest":
      return applyNestPure(nodeInput, node.config as NestConfig, node.id, errors);

    case "flatten":
      return applyFlattenPure(
        nodeInput,
        node.config as FlattenConfig,
        node.id,
        errors,
      );

    case "sort":
      return applySortPure(
        nodeInput,
        node.config as SortConfig,
        node.id,
        errors,
      );

    case "map":
      return executeMapNode(nodeInput, node, graph, errors);

    case "project":
      return executeProjectNode(
        nodeInput,
        node.config as ProjectConfig,
        node.id,
        errors,
      );

    case "condition":
      errors.push({
        type: "GRAPH_INVALID",
        message: "Condition nodes are not supported in MVP 2 flow execution yet",
        nodeId: node.id,
      });
      return nodeInput;

    default:
      errors.push({
        type: "GRAPH_INVALID",
        message: `Unknown node type "${node.type as string}"`,
        nodeId: node.id,
      });
      return nodeInput;
  }
}
