import type { GraphEdge, GraphNode, GraphValidationResult, TransformGraph } from "./types";

export function validateGraph(graph: TransformGraph): GraphValidationResult {
  const errors: string[] = [];

  if (graph.version !== 2) {
    errors.push("Graph version must be 2");
  }

  if (!graph.id || typeof graph.id !== "string") {
    errors.push("Graph must have a string id");
  }

  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    errors.push("Graph must have at least one node");
    return { valid: false, errors };
  }

  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (!node.id || typeof node.id !== "string") {
      errors.push("Every node must have a string id");
      continue;
    }
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id "${node.id}"`);
    }
    nodeIds.add(node.id);
  }

  const inputNodes = graph.nodes.filter((n) => n.type === "input");
  const outputNodes = graph.nodes.filter((n) => n.type === "output");

  if (inputNodes.length !== 1) {
    errors.push(`Graph must have exactly one input node (found ${inputNodes.length})`);
  }

  if (outputNodes.length < 1) {
    errors.push("Graph must have at least one output node");
  }

  const edges = graph.edges ?? [];
  for (const edge of edges) {
    if (!nodeIds.has(edge.from)) {
      errors.push(`Edge references unknown source node "${edge.from}"`);
    }
    if (!nodeIds.has(edge.to)) {
      errors.push(`Edge references unknown target node "${edge.to}"`);
    }
    if (edge.from === edge.to) {
      errors.push(`Self-loop edge on node "${edge.from}"`);
    }
  }

  const cycle = detectCycle(graph.nodes, edges);
  if (cycle) {
    errors.push(`Graph contains a cycle involving node "${cycle}"`);
  }

  validateMapBodyRefs(graph.nodes, nodeIds, errors);
  validateConditionRefs(graph.nodes, nodeIds, errors);

  return { valid: errors.length === 0, errors };
}

function validateMapBodyRefs(
  nodes: GraphNode[],
  nodeIds: Set<string>,
  errors: string[],
): void {
  for (const node of nodes) {
    if (node.type !== "map") continue;
    const body = (node.config as { body?: string[] } | undefined)?.body;
    if (!Array.isArray(body)) {
      errors.push(`Map node "${node.id}" must have config.body array`);
      continue;
    }
    for (const id of body) {
      if (!nodeIds.has(id)) {
        errors.push(`Map node "${node.id}" references unknown body node "${id}"`);
      }
    }
  }
}

function validateConditionRefs(
  nodes: GraphNode[],
  nodeIds: Set<string>,
  errors: string[],
): void {
  for (const node of nodes) {
    if (node.type !== "condition") continue;
    const cfg = node.config as { thenNode?: string; elseNode?: string } | undefined;
    if (cfg?.thenNode && !nodeIds.has(cfg.thenNode)) {
      errors.push(`Condition node "${node.id}" references unknown thenNode`);
    }
    if (cfg?.elseNode && !nodeIds.has(cfg.elseNode)) {
      errors.push(`Condition node "${node.id}" references unknown elseNode`);
    }
  }
}

function detectCycle(nodes: GraphNode[], edges: GraphEdge[]): string | null {
  const nodeIds = nodes.map((n) => n.id);
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const edge of edges) {
    adj.get(edge.from)?.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const queue = nodeIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
  let visited = 0;

  while (queue.length > 0) {
    const id = queue.shift()!;
    visited++;
    for (const next of adj.get(id) ?? []) {
      const deg = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  if (visited === nodeIds.length) return null;

  for (const id of nodeIds) {
    if ((inDegree.get(id) ?? 0) > 0) return id;
  }
  return nodeIds[0] ?? null;
}

export function topologicalSort(graph: TransformGraph): string[] | null {
  const validation = validateGraph(graph);
  if (!validation.valid) return null;

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const edge of graph.edges) {
    adj.get(edge.from)?.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const queue = graph.nodes
    .filter((n) => (inDegree.get(n.id) ?? 0) === 0)
    .map((n) => n.id);

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

  return order.length === graph.nodes.length ? order : null;
}
