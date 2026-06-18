import type { Edge, Node, NodeTypes } from "@xyflow/react";
import type {
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeData,
} from "./workflow-canvas-types";

export type ReactFlowWorkflowNode = Node<WorkflowNodeData, string>;

export const UNKNOWN_NODE_TYPE = "unknown";
export const ORIGINAL_TYPE_DATA_KEY = "__originalType";

/**
 * Deep equality for plain JSON-serializable graph payloads (node data, edge data).
 * Key order in objects affects the result.
 */
export function stableValueEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizeHandle(handle: string | null | undefined): string | undefined {
  return handle ?? undefined;
}

function normalizeAnimated(animated: boolean | undefined): boolean {
  return animated ?? true;
}

function getRegisteredNodeTypeKeys(
  resolvedNodeTypes?: NodeTypes,
): Set<string> {
  return new Set(Object.keys(resolvedNodeTypes ?? {}));
}

export function normalizeNodeTypeForRender(
  node: WorkflowNode,
  resolvedNodeTypes?: NodeTypes,
): ReactFlowWorkflowNode {
  const registeredTypes = getRegisteredNodeTypeKeys(resolvedNodeTypes);

  if (registeredTypes.has(node.type)) {
    return {
      ...node,
      type: node.type,
      data: node.data,
    };
  }

  return {
    ...node,
    type: UNKNOWN_NODE_TYPE,
    data: {
      ...node.data,
      [ORIGINAL_TYPE_DATA_KEY]: node.type,
    },
  };
}

function getDomainNodeType(node: Node<WorkflowNodeData>): string {
  if (
    node.type === UNKNOWN_NODE_TYPE &&
    typeof node.data[ORIGINAL_TYPE_DATA_KEY] === "string"
  ) {
    return node.data[ORIGINAL_TYPE_DATA_KEY] as string;
  }

  return node.type ?? UNKNOWN_NODE_TYPE;
}

function getDomainNodeData(node: Node<WorkflowNodeData>): WorkflowNodeData {
  if (
    node.type === UNKNOWN_NODE_TYPE &&
    ORIGINAL_TYPE_DATA_KEY in node.data
  ) {
    const { [ORIGINAL_TYPE_DATA_KEY]: _originalType, ...rest } = node.data;
    return rest as WorkflowNodeData;
  }

  return node.data;
}

export function toReactFlowNodes(
  nodes: WorkflowNode[],
  resolvedNodeTypes?: NodeTypes,
): ReactFlowWorkflowNode[] {
  return nodes.map((node) =>
    normalizeNodeTypeForRender(node, resolvedNodeTypes),
  );
}

export function toReactFlowEdges(edges: WorkflowEdge[]): Edge[] {
  return edges.map((edge) => ({
    ...edge,
    type: "default",
    animated: edge.animated ?? true,
  }));
}

export function fromReactFlowNode(node: Node<WorkflowNodeData>): WorkflowNode {
  return {
    id: node.id,
    type: getDomainNodeType(node),
    position: node.position,
    data: getDomainNodeData(node),
  };
}

export function fromReactFlowNodes(
  nodes: Node<WorkflowNodeData>[],
): WorkflowNode[] {
  return nodes.map(fromReactFlowNode);
}

export function removeWorkflowEdgeById(
  edges: WorkflowEdge[],
  edgeId: string,
): WorkflowEdge[] {
  return edges.filter((edge) => edge.id !== edgeId);
}

export function fromReactFlowEdges(edges: Edge[]): WorkflowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    animated: edge.animated,
  }));
}

export function reactFlowNodesMatchExternal(
  current: Node<WorkflowNodeData>[],
  external: WorkflowNode[],
  resolvedNodeTypes?: NodeTypes,
): boolean {
  const externalRf = toReactFlowNodes(external, resolvedNodeTypes);
  if (current.length !== externalRf.length) return false;

  const externalById = new Map(externalRf.map((node) => [node.id, node]));

  for (const node of current) {
    const other = externalById.get(node.id);
    if (!other) return false;
    if (
      node.position.x !== other.position.x ||
      node.position.y !== other.position.y
    ) {
      return false;
    }
    if (getDomainNodeType(node) !== getDomainNodeType(other)) return false;
    if (!stableValueEqual(getDomainNodeData(node), getDomainNodeData(other))) {
      return false;
    }
  }

  return true;
}

export function reactFlowEdgesMatchExternal(
  current: Edge[],
  external: WorkflowEdge[],
): boolean {
  const externalRf = toReactFlowEdges(external);
  if (current.length !== externalRf.length) return false;

  const externalById = new Map(externalRf.map((edge) => [edge.id, edge]));

  for (const edge of current) {
    const other = externalById.get(edge.id);
    if (!other) return false;
    if (edge.source !== other.source || edge.target !== other.target) {
      return false;
    }
    if (
      normalizeHandle(edge.sourceHandle) !==
      normalizeHandle(other.sourceHandle)
    ) {
      return false;
    }
    if (
      normalizeHandle(edge.targetHandle) !==
      normalizeHandle(other.targetHandle)
    ) {
      return false;
    }
    if (
      normalizeAnimated(edge.animated) !== normalizeAnimated(other.animated)
    ) {
      return false;
    }
    if (!stableValueEqual(edge.data, other.data)) return false;
  }

  return true;
}
