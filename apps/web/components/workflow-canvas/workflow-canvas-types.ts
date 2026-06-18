import type { CSSProperties } from "react";
import type {
  Connection,
  Edge,
  NodeTypes,
  Position,
  ReactFlowProps,
} from "@xyflow/react";
import type { LucideIcon } from "lucide-react";
import type { ReactFlowWorkflowNode } from "./workflow-canvas-graph";

export type WorkflowPosition = { x: number; y: number };

export type NodeStatus = "idle" | "running" | "success" | "error" | "warning";

export type WorkflowNodeType = string;

export type WorkflowHandleType = "source" | "target";

export type WorkflowHandleConfig = {
  id: string;
  type: WorkflowHandleType;
  position: Position;
  label?: string;
  style?: CSSProperties;
  /** Output type for source handles (e.g. "boolean", "image", "json") */
  dataType?: string;
  /** Allowed input types for target handles. Omit = accept anything (legacy). */
  accepts?: string[];
};

export type WorkflowConnectionValidationContext = {
  connection: Connection;
  sourceNode: WorkflowNode;
  targetNode: WorkflowNode;
  sourceHandle: WorkflowHandleConfig | null;
  targetHandle: WorkflowHandleConfig | null;
};

export type WorkflowIsValidConnection = (
  context: WorkflowConnectionValidationContext,
) => boolean;

export type WorkflowValidationIssue = {
  code: string;
  message: string;
};

export type WorkflowGraphValidationResult = {
  valid: boolean;
  nodeErrors: Record<string, WorkflowValidationIssue[]>;
  edgeErrors: Record<string, WorkflowValidationIssue[]>;
  graphErrors: WorkflowValidationIssue[];
};

export type WorkflowGraphValidationContext = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  registry: Record<string, NodeTypeConfig>;
};

export type WorkflowGraphValidationRuleIssue =
  | { scope: "graph"; issue: WorkflowValidationIssue }
  | { scope: "node"; nodeId: string; issue: WorkflowValidationIssue }
  | { scope: "edge"; edgeId: string; issue: WorkflowValidationIssue };

export type WorkflowGraphValidationRule = (
  context: WorkflowGraphValidationContext,
) => WorkflowGraphValidationRuleIssue[] | void;

export type ValidateGraphOptions = {
  registry?: Record<string, NodeTypeConfig>;
  /** Explicit entry types; overrides registry role inference */
  entryNodeTypes?: string[];
  rules?: WorkflowGraphValidationRule[];
  /** Replay connect-time business rules on existing edges */
  isValidConnection?: WorkflowIsValidConnection;
  /** When true, reject connections that would create a directed cycle */
  preventCycles?: boolean;
};

export interface NodeValidation {
  hasError: boolean;
  message?: string;
}

export interface WorkflowNodeData {
  label: string;
  description?: string;
  icon?: string;
  status?: NodeStatus;
  validation?: NodeValidation;
  isExpanded?: boolean;
  config?: Record<string, unknown>;
  handles?: WorkflowHandleConfig[];
  [key: string]: unknown;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;
}

export type WorkflowCanvasClassNames = {
  canvas?: string;
  node?: string;
  edge?: string;
  controls?: string;
};

export type WorkflowMinimapOptions = {
  nodeColor?: (node: ReactFlowWorkflowNode) => string;
  style?: CSSProperties;
  maskColor?: string;
  className?: string;
};

export type WorkflowCanvasControlsPosition = "bottom-left" | "bottom-right";

export type WorkflowCanvasAPI = {
  addNode: (node: WorkflowNode) => void;
  createNode: (type: WorkflowNodeType, position?: WorkflowPosition) => WorkflowNode;
  getNodes: () => WorkflowNode[];
  getEdges: () => WorkflowEdge[];
  validateGraph: (options?: ValidateGraphOptions) => WorkflowGraphValidationResult;
  fitView: (options?: { padding?: number; duration?: number }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  screenToFlowPosition: (point: WorkflowPosition) => WorkflowPosition;
};

export type WorkflowCanvasHandle = WorkflowCanvasAPI;

export type WorkflowNodePickerRenderProps = {
  position: WorkflowPosition;
  addNode: (node: WorkflowNode) => void;
  close: () => void;
};

export interface NodeTypeConfig {
  type: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  handles: WorkflowHandleConfig[];
  /** Entry-point role for graph validation (e.g. trigger) */
  role?: "entry" | "normal" | "exit";
  /** Each listed source handle must have at least one outgoing edge */
  requiredSourceHandles?: string[];
  /** Each listed target handle must have at least one incoming edge */
  requiredTargetHandles?: string[];
}

export type ReactFlowWorkflowEdge = Edge;

export type WorkflowCanvasConfigValue = {
  nodeRegistry: Record<string, NodeTypeConfig>;
  iconMap: Partial<Record<string, LucideIcon>>;
  classNames?: WorkflowCanvasClassNames;
  validation?: WorkflowGraphValidationResult;
};

export type WorkflowCanvasPropsBase = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  nodeTypes?: NodeTypes;
  editable?: boolean;
  height?: string | number;
  autoFitView?: boolean;
  nodeRegistry?: Record<string, NodeTypeConfig>;
  iconMap?: Partial<Record<string, LucideIcon>>;
  classNames?: WorkflowCanvasClassNames;
  panOnDrag?: ReactFlowProps["panOnDrag"];
  minimap?: boolean | React.ReactNode;
  minimapOptions?: WorkflowMinimapOptions;
  controls?: React.ReactNode | false;
  controlsPosition?: WorkflowCanvasControlsPosition;
  background?: boolean;
  onAddNode?: (node: WorkflowNode) => void;
  onPaneContextMenu?: (position: WorkflowPosition, event: MouseEvent) => void;
  renderNodePicker?: (args: WorkflowNodePickerRenderProps) => React.ReactNode;
  onNodeDrop?: (
    event: DragEvent,
    position: WorkflowPosition,
    type: WorkflowNodeType,
  ) => void;
  renderControls?: (api: WorkflowCanvasAPI) => React.ReactNode;
  showAddNodeInControls?: boolean;
  onNodesChange?: (nodes: WorkflowNode[]) => void;
  onEdgesChange?: (edges: WorkflowEdge[]) => void;
  onConnect?: (connection: Connection) => void;
  /** Optional business-rule hook; runs after built-in structural + port checks. */
  isValidConnection?: WorkflowIsValidConnection;
  /** When true, reject connections that would create a directed cycle (DAG enforcement). */
  preventCycles?: boolean;
  validationOptions?: ValidateGraphOptions;
  validateOnChange?: boolean;
  onValidationChange?: (result: WorkflowGraphValidationResult) => void;
  onNodeSelect?: (node: WorkflowNode | null) => void;
  onNodeDoubleClick?: (node: WorkflowNode) => void;
  className?: string;
};

export type WorkflowCanvasProps = WorkflowCanvasPropsBase;
