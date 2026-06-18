import type { Connection, IsValidConnection } from "@xyflow/react";
import { resolveNodeHandles } from "./workflow-canvas-handles";
import { resolveNodeTypeConfig } from "./workflow-canvas-registry";
import type {
  NodeTypeConfig,
  WorkflowConnectionValidationContext,
  WorkflowEdge,
  WorkflowHandleConfig,
  WorkflowHandleType,
  WorkflowIsValidConnection,
  WorkflowNode,
  WorkflowValidationIssue,
} from "./workflow-canvas-types";

export function resolveHandleById(
  handles: WorkflowHandleConfig[],
  handleId: string | null | undefined,
  expectedType: WorkflowHandleType,
): WorkflowHandleConfig | null {
  const ofType = handles.filter((handle) => handle.type === expectedType);

  if (handleId != null && handleId !== "") {
    const match = ofType.find((handle) => handle.id === handleId);
    return match ?? null;
  }

  if (ofType.length === 1) {
    return ofType[0] ?? null;
  }

  return null;
}

export function arePortTypesCompatible(
  source: WorkflowHandleConfig | null,
  target: WorkflowHandleConfig | null,
): boolean {
  if (!source || !target) return false;

  const sourceTyped = Boolean(source.dataType);
  const targetTyped = Boolean(target.accepts?.length);

  if (!sourceTyped && !targetTyped) return true;
  if (sourceTyped && !targetTyped) return true;
  if (!sourceTyped && targetTyped) return true;

  const accepts = target.accepts ?? [];
  if (accepts.includes("any") || accepts.includes("*")) return true;
  if (source.dataType == null) return false;

  return accepts.includes(source.dataType);
}

export function buildAdjacencyList(
  edges: WorkflowEdge[],
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    const next = adjacency.get(edge.source) ?? [];
    next.push(edge.target);
    adjacency.set(edge.source, next);
  }

  return adjacency;
}

export function hasDirectedPath(
  from: string,
  to: string,
  edges: WorkflowEdge[],
): boolean {
  if (from === to) return true;

  const adjacency = buildAdjacencyList(edges);
  const visited = new Set<string>();
  const queue = [from];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current == null || visited.has(current)) continue;

    visited.add(current);

    for (const target of adjacency.get(current) ?? []) {
      if (target === to) return true;
      if (!visited.has(target)) {
        queue.push(target);
      }
    }
  }

  return false;
}

export function wouldCreateCycle(
  source: string,
  target: string,
  edges: WorkflowEdge[],
): boolean {
  if (source === target) return true;
  return hasDirectedPath(target, source, edges);
}

export function getCycleConnectionIssue(): WorkflowValidationIssue {
  return {
    code: "cycle_detected",
    message: "Connection would create a cycle in the workflow",
  };
}

export function buildConnectionValidationContext(
  connection: Connection,
  nodes: WorkflowNode[],
  registry: Record<string, NodeTypeConfig>,
): WorkflowConnectionValidationContext | null {
  const sourceNode = nodes.find((node) => node.id === connection.source);
  const targetNode = nodes.find((node) => node.id === connection.target);

  if (!sourceNode || !targetNode) return null;

  const sourceConfig = resolveNodeTypeConfig(sourceNode.type, registry);
  const targetConfig = resolveNodeTypeConfig(targetNode.type, registry);
  const sourceHandles = resolveNodeHandles(sourceConfig, sourceNode.data);
  const targetHandles = resolveNodeHandles(targetConfig, targetNode.data);

  const sourceHandle = resolveHandleById(
    sourceHandles,
    connection.sourceHandle,
    "source",
  );
  const targetHandle = resolveHandleById(
    targetHandles,
    connection.targetHandle,
    "target",
  );

  return {
    connection,
    sourceNode,
    targetNode,
    sourceHandle,
    targetHandle,
  };
}

export function validateWorkflowConnection(
  context: WorkflowConnectionValidationContext,
): boolean {
  return getWorkflowConnectionIssues(context).length === 0;
}

export function getWorkflowConnectionIssues(
  context: WorkflowConnectionValidationContext,
): WorkflowValidationIssue[] {
  const { sourceHandle, targetHandle, connection } = context;
  const issues: WorkflowValidationIssue[] = [];

  if (!sourceHandle) {
    issues.push({
      code: "invalid_connection",
      message: `Missing or invalid source handle "${connection.sourceHandle ?? ""}" on node "${connection.source}"`,
    });
  } else if (sourceHandle.type !== "source") {
    issues.push({
      code: "invalid_connection",
      message: `Handle "${sourceHandle.id}" on node "${connection.source}" is not a source handle`,
    });
  }

  if (!targetHandle) {
    issues.push({
      code: "invalid_connection",
      message: `Missing or invalid target handle "${connection.targetHandle ?? ""}" on node "${connection.target}"`,
    });
  } else if (targetHandle.type !== "target") {
    issues.push({
      code: "invalid_connection",
      message: `Handle "${targetHandle.id}" on node "${connection.target}" is not a target handle`,
    });
  }

  if (
    sourceHandle &&
    targetHandle &&
    sourceHandle.type === "source" &&
    targetHandle.type === "target" &&
    !arePortTypesCompatible(sourceHandle, targetHandle)
  ) {
    issues.push({
      code: "port_type_mismatch",
      message: `Port type "${sourceHandle.dataType ?? "unknown"}" is not compatible with target accepts [${(targetHandle.accepts ?? []).join(", ")}]`,
    });
  }

  return issues;
}

type CreateIsValidConnectionOptions = {
  getNodes: () => WorkflowNode[];
  getEdges: () => WorkflowEdge[];
  registry: Record<string, NodeTypeConfig>;
  preventCycles?: boolean;
  user?: WorkflowIsValidConnection;
};

export function createIsValidConnection({
  getNodes,
  getEdges,
  registry,
  preventCycles = false,
  user,
}: CreateIsValidConnectionOptions): IsValidConnection {
  return (connection): boolean => {
    const normalized: Connection = {
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? null,
      targetHandle: connection.targetHandle ?? null,
    };

    const context = buildConnectionValidationContext(
      normalized,
      getNodes(),
      registry,
    );

    if (!context) return false;
    if (!validateWorkflowConnection(context)) return false;

    if (
      preventCycles &&
      wouldCreateCycle(normalized.source, normalized.target, getEdges())
    ) {
      return false;
    }

    return user?.(context) ?? true;
  };
}
