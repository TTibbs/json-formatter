import {
  buildConnectionValidationContext,
  getCycleConnectionIssue,
  getWorkflowConnectionIssues,
  hasDirectedPath,
} from "./workflow-canvas-connections";
import { resolveNodeTypeConfig } from "./workflow-canvas-registry";
import type {
  NodeTypeConfig,
  ValidateGraphOptions,
  WorkflowEdge,
  WorkflowGraphValidationContext,
  WorkflowGraphValidationResult,
  WorkflowGraphValidationRuleIssue,
  WorkflowNode,
  WorkflowValidationIssue,
} from "./workflow-canvas-types";

export function createEmptyValidationResult(): WorkflowGraphValidationResult {
  return {
    valid: true,
    nodeErrors: {},
    edgeErrors: {},
    graphErrors: [],
  };
}

export function resolveEntryNodeTypes(
  registry: Record<string, NodeTypeConfig>,
  override?: string[],
): string[] {
  if (override != null) {
    return override;
  }

  return Object.values(registry)
    .filter((config) => config.role === "entry")
    .map((config) => config.type);
}

function appendNodeError(
  nodeErrors: Record<string, WorkflowValidationIssue[]>,
  nodeId: string,
  issue: WorkflowValidationIssue,
) {
  const existing = nodeErrors[nodeId] ?? [];
  nodeErrors[nodeId] = [...existing, issue];
}

function appendEdgeError(
  edgeErrors: Record<string, WorkflowValidationIssue[]>,
  edgeId: string,
  issue: WorkflowValidationIssue,
) {
  const existing = edgeErrors[edgeId] ?? [];
  edgeErrors[edgeId] = [...existing, issue];
}

export function mergeValidationResults(
  ...results: WorkflowGraphValidationResult[]
): WorkflowGraphValidationResult {
  const merged = createEmptyValidationResult();

  for (const result of results) {
    for (const [nodeId, issues] of Object.entries(result.nodeErrors)) {
      for (const issue of issues) {
        appendNodeError(merged.nodeErrors, nodeId, issue);
      }
    }

    for (const [edgeId, issues] of Object.entries(result.edgeErrors)) {
      for (const issue of issues) {
        appendEdgeError(merged.edgeErrors, edgeId, issue);
      }
    }

    merged.graphErrors.push(...result.graphErrors);
  }

  merged.valid =
    Object.keys(merged.nodeErrors).length === 0 &&
    Object.keys(merged.edgeErrors).length === 0 &&
    merged.graphErrors.length === 0;

  return merged;
}

export function validateEdges(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: ValidateGraphOptions = {},
): WorkflowGraphValidationResult {
  const result = createEmptyValidationResult();
  const registry = options.registry ?? {};
  const nodeIds = new Set(nodes.map((node) => node.id));

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      appendEdgeError(result.edgeErrors, edge.id, {
        code: "dangling_edge",
        message: "Edge references a missing source or target node",
      });
      continue;
    }

    const connection = {
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
    };

    const context = buildConnectionValidationContext(connection, nodes, registry);

    if (!context) {
      appendEdgeError(result.edgeErrors, edge.id, {
        code: "dangling_edge",
        message: "Could not resolve connection context",
      });
      continue;
    }

    const connectionIssues = getWorkflowConnectionIssues(context);
    for (const issue of connectionIssues) {
      appendEdgeError(result.edgeErrors, edge.id, issue);
    }

    if (
      options.isValidConnection &&
      connectionIssues.length === 0 &&
      !options.isValidConnection(context)
    ) {
      appendEdgeError(result.edgeErrors, edge.id, {
        code: "connection_rule_violation",
        message: "Connection violates a business rule",
      });
    }
  }

  result.valid =
    Object.keys(result.nodeErrors).length === 0 &&
    Object.keys(result.edgeErrors).length === 0 &&
    result.graphErrors.length === 0;

  return result;
}

export function validateRequiredHandles(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: ValidateGraphOptions = {},
): WorkflowGraphValidationResult {
  const result = createEmptyValidationResult();
  const registry = options.registry ?? {};

  const outgoingByNodeHandle = new Map<string, Set<string>>();
  const incomingByNodeHandle = new Map<string, Set<string>>();

  for (const edge of edges) {
    const outgoing = outgoingByNodeHandle.get(edge.source) ?? new Set<string>();
    if (edge.sourceHandle) {
      outgoing.add(edge.sourceHandle);
    }
    outgoingByNodeHandle.set(edge.source, outgoing);

    const incoming = incomingByNodeHandle.get(edge.target) ?? new Set<string>();
    if (edge.targetHandle) {
      incoming.add(edge.targetHandle);
    }
    incomingByNodeHandle.set(edge.target, incoming);
  }

  for (const node of nodes) {
    const config = resolveNodeTypeConfig(node.type, registry);
    const requiredSources =
      config.requiredSourceHandles ??
      (node.data.requiredSourceHandles as string[] | undefined);
    const requiredTargets =
      config.requiredTargetHandles ??
      (node.data.requiredTargetHandles as string[] | undefined);

    const outgoing = outgoingByNodeHandle.get(node.id) ?? new Set<string>();
    const incoming = incomingByNodeHandle.get(node.id) ?? new Set<string>();

    for (const handleId of requiredSources ?? []) {
      if (!outgoing.has(handleId)) {
        appendNodeError(result.nodeErrors, node.id, {
          code: "missing_required_branch",
          message: `Required output "${handleId}" has no connection`,
        });
      }
    }

    for (const handleId of requiredTargets ?? []) {
      if (!incoming.has(handleId)) {
        appendNodeError(result.nodeErrors, node.id, {
          code: "missing_required_input",
          message: `Required input "${handleId}" has no connection`,
        });
      }
    }
  }

  result.valid =
    Object.keys(result.nodeErrors).length === 0 &&
    Object.keys(result.edgeErrors).length === 0 &&
    result.graphErrors.length === 0;

  return result;
}

function collectReachableNodeIds(
  entryNodeIds: string[],
  edges: WorkflowEdge[],
): Set<string> {
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    const next = adjacency.get(edge.source) ?? [];
    next.push(edge.target);
    adjacency.set(edge.source, next);
  }

  const reachable = new Set<string>();
  const queue = [...entryNodeIds];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current == null || reachable.has(current)) continue;

    reachable.add(current);

    for (const target of adjacency.get(current) ?? []) {
      if (!reachable.has(target)) {
        queue.push(target);
      }
    }
  }

  return reachable;
}

export function validateGraphStructure(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: ValidateGraphOptions = {},
): WorkflowGraphValidationResult {
  const result = createEmptyValidationResult();
  const registry = options.registry ?? {};

  if (nodes.length === 0) {
    return result;
  }

  const entryTypes = resolveEntryNodeTypes(registry, options.entryNodeTypes);

  if (entryTypes.length === 0) {
    return result;
  }

  const entryNodes = nodes.filter((node) => entryTypes.includes(node.type));

  if (entryNodes.length === 0) {
    result.graphErrors.push({
      code: "missing_entry_node",
      message: "Workflow must include an entry node",
    });
  }

  if (entryNodes.length === 0) {
    result.valid = result.graphErrors.length === 0;
    return result;
  }

  const reachable = collectReachableNodeIds(
    entryNodes.map((node) => node.id),
    edges,
  );

  let hasUnreachable = false;

  for (const node of nodes) {
    if (!reachable.has(node.id)) {
      hasUnreachable = true;
      appendNodeError(result.nodeErrors, node.id, {
        code: "disconnected_node",
        message: "Not reachable from an entry node",
      });
    }
  }

  if (hasUnreachable) {
    result.graphErrors.push({
      code: "disconnected_workflow",
      message: "Workflow contains nodes that are not reachable from an entry node",
    });
  }

  result.valid =
    Object.keys(result.nodeErrors).length === 0 &&
    Object.keys(result.edgeErrors).length === 0 &&
    result.graphErrors.length === 0;

  return result;
}

export function validateCycles(
  edges: WorkflowEdge[],
  options: ValidateGraphOptions = {},
): WorkflowGraphValidationResult {
  const result = createEmptyValidationResult();

  if (!options.preventCycles || edges.length === 0) {
    return result;
  }

  let hasCycleEdge = false;

  for (const edge of edges) {
    const others = edges.filter((candidate) => candidate.id !== edge.id);
    if (hasDirectedPath(edge.target, edge.source, others)) {
      hasCycleEdge = true;
      appendEdgeError(result.edgeErrors, edge.id, getCycleConnectionIssue());
    }
  }

  if (hasCycleEdge) {
    result.graphErrors.push({
      code: "workflow_cycle",
      message: "Workflow contains a cycle",
    });
  }

  result.valid =
    Object.keys(result.nodeErrors).length === 0 &&
    Object.keys(result.edgeErrors).length === 0 &&
    result.graphErrors.length === 0;

  return result;
}

function applyRuleIssues(
  result: WorkflowGraphValidationResult,
  ruleIssues: WorkflowGraphValidationRuleIssue[],
) {
  for (const item of ruleIssues) {
    if (item.scope === "graph") {
      result.graphErrors.push(item.issue);
    } else if (item.scope === "node") {
      appendNodeError(result.nodeErrors, item.nodeId, item.issue);
    } else {
      appendEdgeError(result.edgeErrors, item.edgeId, item.issue);
    }
  }
}

export function validateGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: ValidateGraphOptions = {},
): WorkflowGraphValidationResult {
  const registry = options.registry ?? {};
  const merged = mergeValidationResults(
    validateEdges(nodes, edges, options),
    validateRequiredHandles(nodes, edges, options),
    validateGraphStructure(nodes, edges, options),
    validateCycles(edges, options),
  );

  const context: WorkflowGraphValidationContext = {
    nodes,
    edges,
    registry,
  };

  for (const rule of options.rules ?? []) {
    const ruleIssues = rule(context);
    if (ruleIssues?.length) {
      applyRuleIssues(merged, ruleIssues);
    }
  }

  merged.valid =
    Object.keys(merged.nodeErrors).length === 0 &&
    Object.keys(merged.edgeErrors).length === 0 &&
    merged.graphErrors.length === 0;

  return merged;
}

export function applyGraphValidationToNodes(
  nodes: WorkflowNode[],
  result: WorkflowGraphValidationResult,
): WorkflowNode[] {
  return nodes.map((node) => {
    const issues = result.nodeErrors[node.id];
    if (!issues?.length) {
      if (!node.data.validation?.hasError) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          validation: undefined,
        },
      };
    }

    return {
      ...node,
      data: {
        ...node.data,
        validation: {
          hasError: true,
          message: issues[0]?.message,
        },
      },
    };
  });
}
