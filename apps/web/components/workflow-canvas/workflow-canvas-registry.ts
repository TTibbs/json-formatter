import { Position } from "@xyflow/react";
import type {
  NodeTypeConfig,
  WorkflowNode,
  WorkflowPosition,
} from "./workflow-canvas-types";

export function createDefaultNodeTypeConfig(type: string): NodeTypeConfig {
  return {
    type,
    label: type,
    description: "",
    icon: "",
    color: "slate",
    handles: [
      { id: "input", type: "target", position: Position.Left },
      { id: "output", type: "source", position: Position.Right },
    ],
  };
}

export function resolveNodeTypeConfig(
  type: string,
  registry: Record<string, NodeTypeConfig>,
): NodeTypeConfig {
  return registry[type] ?? createDefaultNodeTypeConfig(type);
}

export function getNodeConfig(
  type: string,
  registry: Record<string, NodeTypeConfig> = {},
): NodeTypeConfig {
  return resolveNodeTypeConfig(type, registry);
}

export function getAllNodeTypes(
  registry: Record<string, NodeTypeConfig> = {},
): NodeTypeConfig[] {
  return Object.values(registry);
}

function createUniqueId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createWorkflowNodeId(type: string) {
  return createUniqueId(`workflow-node-${type}`);
}

export function createWorkflowNode(
  type: string,
  position?: WorkflowPosition,
  registry: Record<string, NodeTypeConfig> = {},
): WorkflowNode {
  const config = resolveNodeTypeConfig(type, registry);
  return {
    id: createWorkflowNodeId(type),
    type,
    position: position ?? { x: 0, y: 0 },
    data: {
      label: config.label ?? type,
      description: config.description,
    },
  };
}
