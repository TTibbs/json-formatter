"use client";

import {
  createContext,
  forwardRef,
  memo,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type Ref,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  useStore,
  useOnViewportChange,
  type Connection,
  type IsValidConnection,
  type Viewport,
  type NodeChange,
  type EdgeChange,
  type Node,
  type Edge,
  type EdgeTypes,
  type EdgeProps,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  SelectionMode,
  ConnectionLineType,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Unlock,
  Grid3X3,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fromReactFlowEdges,
  fromReactFlowNode,
  fromReactFlowNodes,
  reactFlowEdgesMatchExternal,
  reactFlowNodesMatchExternal,
  toReactFlowEdges,
  toReactFlowNodes,
  type ReactFlowWorkflowNode,
} from "./workflow-canvas-graph";
import {
  createWorkflowNode,
  getAllNodeTypes,
} from "./workflow-canvas-registry";
import { UnknownFlowNode } from "./unknown-flow-node";
import {
  WorkflowCanvasConfigContext,
  useWorkflowCanvasConfig,
} from "./workflow-canvas-context";
import { createIsValidConnection } from "./workflow-canvas-connections";
import {
  createEmptyValidationResult,
  validateGraph as runValidateGraph,
} from "./workflow-canvas-validation";
import type {
  NodeTypeConfig,
  ValidateGraphOptions,
  WorkflowCanvasAPI,
  WorkflowCanvasConfigValue,
  WorkflowCanvasControlsPosition,
  WorkflowCanvasHandle,
  WorkflowCanvasProps,
  WorkflowEdge as WorkflowEdgeModel,
  WorkflowGraphValidationResult,
  WorkflowMinimapOptions,
  WorkflowNode,
  WorkflowNodeData,
  WorkflowNodePickerRenderProps,
  WorkflowNodeType,
  WorkflowPosition,
} from "./workflow-canvas-types";
export type {
  NodeTypeConfig,
  NodeStatus,
  NodeValidation,
  WorkflowCanvasAPI,
  WorkflowCanvasClassNames,
  WorkflowCanvasControlsPosition,
  WorkflowCanvasHandle,
  WorkflowCanvasProps,
  WorkflowConnectionValidationContext,
  WorkflowGraphValidationResult,
  WorkflowGraphValidationContext,
  WorkflowGraphValidationRule,
  WorkflowGraphValidationRuleIssue,
  WorkflowIsValidConnection,
  WorkflowValidationIssue,
  ValidateGraphOptions,
  WorkflowMinimapOptions,
  WorkflowNode,
  WorkflowNodeData,
  WorkflowNodePickerRenderProps,
  WorkflowNodeType,
  WorkflowPosition,
} from "./workflow-canvas-types";
export {
  createWorkflowNode,
  getAllNodeTypes,
  getNodeConfig,
  resolveNodeTypeConfig,
} from "./workflow-canvas-registry";
export { UnknownFlowNode } from "./unknown-flow-node";
export {
  WorkflowCanvasConfigContext,
  useWorkflowCanvasConfig,
} from "./workflow-canvas-context";
export {
  WorkflowNodeHandles,
  layoutHandleStyles,
  resolveNodeHandles,
} from "./workflow-canvas-handles";
export {
  arePortTypesCompatible,
  buildAdjacencyList,
  buildConnectionValidationContext,
  createIsValidConnection,
  getCycleConnectionIssue,
  getWorkflowConnectionIssues,
  hasDirectedPath,
  resolveHandleById,
  validateWorkflowConnection,
  wouldCreateCycle,
} from "./workflow-canvas-connections";
export {
  applyGraphValidationToNodes,
  createEmptyValidationResult,
  mergeValidationResults,
  resolveEntryNodeTypes,
  validateCycles,
  validateEdges,
  validateGraph,
  validateGraphStructure,
  validateRequiredHandles,
} from "./workflow-canvas-validation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const WORKFLOW_NODE_DRAG_TYPE = "application/workflow-node-type";

export type { ReactFlowWorkflowNode } from "./workflow-canvas-graph";
export type ReactFlowWorkflowEdge = Edge;

type PickerAnchorState = {
  /** Flow coordinates from `screenToFlowPosition` (viewport clientX/Y). */
  flow: WorkflowPosition;
  /** Menu position relative to the canvas wrapper (for absolute positioning). */
  menu: WorkflowPosition;
};

function createUniqueId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createWorkflowEdgeId(source: string, target: string) {
  return createUniqueId(`edge-${source}-${target}`);
}

type WorkflowCanvasActionsValue = {
  applyAddNode: (node: WorkflowNode) => void;
  createNode: (
    type: WorkflowNodeType,
    position?: WorkflowPosition,
  ) => WorkflowNode;
  getNodes: () => WorkflowNode[];
  getEdges: () => WorkflowEdgeModel[];
  validateGraph: (options?: ValidateGraphOptions) => WorkflowGraphValidationResult;
  removeEdge: (edgeId: string) => void;
  mergedNodeRegistry: Record<string, NodeTypeConfig>;
  isEditable: boolean;
};

export const WorkflowCanvasActionsContext =
  createContext<WorkflowCanvasActionsValue | null>(null);

type PanMomentumContextValue = {
  stopMomentum: () => void;
};

const PanMomentumContext = createContext<PanMomentumContextValue | null>(null);

function usePanMomentum() {
  return useContext(PanMomentumContext);
}

const PAN_MOMENTUM_FRICTION = 0.92;
const PAN_MOMENTUM_MAX_SPEED = 3;
const PAN_MOMENTUM_MIN_START_SPEED = 0.02;
const PAN_MOMENTUM_MIN_CONTINUE_SPEED = 0.01;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function PanMomentumProvider({
  children,
  stopRef,
}: {
  children: ReactNode;
  stopRef?: RefObject<(() => void) | undefined>;
}) {
  const { setViewport, getViewport } = useReactFlow();
  const paneDragging = useStore((state) => state.paneDragging);
  const paneDraggingRef = useRef(paneDragging);
  const velocity = useRef<WorkflowPosition>({ x: 0, y: 0 });
  const lastMove = useRef({ x: 0, y: 0, t: 0 });
  const momentumFrame = useRef<number | null>(null);
  const gestureZoom = useRef<number | null>(null);
  const pointerPanGesture = useRef(false);
  const wasPaneDragging = useRef(false);

  const stopMomentum = useCallback(() => {
    if (momentumFrame.current !== null) {
      cancelAnimationFrame(momentumFrame.current);
      momentumFrame.current = null;
    }
  }, []);

  const startMomentum = useCallback(
    (initialVelocity: WorkflowPosition) => {
      if (prefersReducedMotion()) return;

      let vx = initialVelocity.x;
      let vy = initialVelocity.y;
      const speed = Math.hypot(vx, vy);
      if (speed < PAN_MOMENTUM_MIN_START_SPEED) return;

      if (speed > PAN_MOMENTUM_MAX_SPEED) {
        vx = (vx / speed) * PAN_MOMENTUM_MAX_SPEED;
        vy = (vy / speed) * PAN_MOMENTUM_MAX_SPEED;
      }

      let prev = performance.now();
      const step = (t: number) => {
        const dt = t - prev;
        prev = t;
        const frames = dt / 16.67;
        vx *= Math.pow(PAN_MOMENTUM_FRICTION, frames);
        vy *= Math.pow(PAN_MOMENTUM_FRICTION, frames);

        const viewport = getViewport();
        void setViewport({
          x: viewport.x + vx * dt,
          y: viewport.y + vy * dt,
          zoom: viewport.zoom,
        });

        if (Math.hypot(vx, vy) > PAN_MOMENTUM_MIN_CONTINUE_SPEED) {
          momentumFrame.current = requestAnimationFrame(step);
        } else {
          momentumFrame.current = null;
        }
      };

      momentumFrame.current = requestAnimationFrame(step);
    },
    [getViewport, setViewport],
  );

  useEffect(() => {
    paneDraggingRef.current = paneDragging;
  }, [paneDragging]);

  useOnViewportChange({
    onStart: () => {
      stopMomentum();
    },
    onChange: (viewport: Viewport) => {
      if (!paneDraggingRef.current || !pointerPanGesture.current) return;

      const now = performance.now();
      const dt = now - lastMove.current.t;
      if (dt > 0) {
        velocity.current = {
          x: (viewport.x - lastMove.current.x) / dt,
          y: (viewport.y - lastMove.current.y) / dt,
        };
      }
      lastMove.current = { x: viewport.x, y: viewport.y, t: now };

      if (
        gestureZoom.current !== null &&
        viewport.zoom !== gestureZoom.current
      ) {
        pointerPanGesture.current = false;
      }
    },
  });

  useEffect(() => {
    if (paneDragging) {
      stopMomentum();
      wasPaneDragging.current = true;
      pointerPanGesture.current = true;
      const viewport = getViewport();
      gestureZoom.current = viewport.zoom;
      velocity.current = { x: 0, y: 0 };
      lastMove.current = {
        x: viewport.x,
        y: viewport.y,
        t: performance.now(),
      };
      return;
    }

    if (!wasPaneDragging.current) return;
    wasPaneDragging.current = false;

    const viewport = getViewport();
    if (
      gestureZoom.current !== null &&
      viewport.zoom !== gestureZoom.current
    ) {
      pointerPanGesture.current = false;
      return;
    }

    if (!pointerPanGesture.current) return;

    startMomentum(velocity.current);
    pointerPanGesture.current = false;
    gestureZoom.current = null;
  }, [getViewport, paneDragging, startMomentum, stopMomentum]);

  useEffect(() => {
    if (stopRef) {
      stopRef.current = stopMomentum;
    }
    return () => {
      stopMomentum();
      if (stopRef) {
        stopRef.current = undefined;
      }
    };
  }, [stopMomentum, stopRef]);

  const contextValue = useMemo<PanMomentumContextValue>(
    () => ({ stopMomentum }),
    [stopMomentum],
  );

  return (
    <PanMomentumContext.Provider value={contextValue}>
      {children}
    </PanMomentumContext.Provider>
  );
}

function useWorkflowCanvasActions(): WorkflowCanvasActionsValue {
  const context = useContext(WorkflowCanvasActionsContext);
  if (!context) {
    throw new Error(
      "useWorkflowCanvasActions must be used within WorkflowCanvas",
    );
  }
  return context;
}

type FlowHelpers = {
  screenToFlowPosition: (point: WorkflowPosition) => WorkflowPosition;
  flowToScreenPosition: (point: WorkflowPosition) => WorkflowPosition;
  zoomIn: (options?: { duration?: number }) => void;
  zoomOut: (options?: { duration?: number }) => void;
  fitView: (options?: { padding?: number; duration?: number }) => void;
};

const controlsPositionClasses: Record<WorkflowCanvasControlsPosition, string> =
  {
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

// --- Workflow edge ---

function WorkflowEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  style,
  markerEnd,
  animated = true,
}: EdgeProps) {
  const { classNames } = useWorkflowCanvasConfig();
  const actions = useContext(WorkflowCanvasActionsContext);
  const removeEdge = actions?.removeEdge;
  const isEditable = actions?.isEditable ?? false;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        className={cn("group/edge", animated && "workflow-edge-animated")}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? "var(--primary)" : "var(--muted-foreground)",
          strokeOpacity: selected ? 1 : 0.55,
          filter: selected
            ? "drop-shadow(0 0 4px color-mix(in oklch, var(--primary) 50%, transparent))"
            : undefined,
        }}
        markerEnd={markerEnd}
      />

      <EdgeLabelRenderer>
        <div
          className={cn(
            "absolute pointer-events-auto nodrag nopan",
            "opacity-0 transition-opacity duration-200",
            "group-hover/edge:opacity-100",
            selected && "opacity-100",
            classNames?.edge,
          )}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <button
            type="button"
            disabled={!isEditable}
            aria-label="Delete connection"
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full",
              "bg-destructive text-destructive-foreground",
              "shadow-lg transition-transform hover:scale-110",
              "focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2",
              !isEditable && "pointer-events-none opacity-50",
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (isEditable && removeEdge) {
                removeEdge(id);
              }
            }}
            title="Delete connection"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const WorkflowEdge = memo(WorkflowEdgeComponent);

// --- Canvas controls ---

type CanvasControlsProps = {
  editable: boolean;
  onToggleEditable?: () => void;
  onToggleSnapToGrid?: () => void;
  snapToGrid?: boolean;
  position?: WorkflowCanvasControlsPosition;
  className?: string;
  api?: WorkflowCanvasAPI;
  showAddNode?: boolean;
  paletteTypes?: NodeTypeConfig[];
  addNodePosition?: WorkflowPosition;
};

function CanvasControlsComponent({
  editable,
  onToggleEditable,
  onToggleSnapToGrid,
  snapToGrid,
  position = "bottom-left",
  className,
  api,
  showAddNode,
  paletteTypes = [],
  addNodePosition,
}: CanvasControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const panMomentum = usePanMomentum();

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const controls = [
    {
      icon: ZoomIn,
      label: "Zoom in",
      shortcut: "Ctrl++",
      onClick: () => {
        panMomentum?.stopMomentum();
        zoomIn({ duration: 200 });
      },
    },
    {
      icon: ZoomOut,
      label: "Zoom out",
      shortcut: "Ctrl+-",
      onClick: () => {
        panMomentum?.stopMomentum();
        zoomOut({ duration: 200 });
      },
    },
    {
      icon: Maximize2,
      label: "Fit view",
      shortcut: "Ctrl+0",
      onClick: () => {
        panMomentum?.stopMomentum();
        fitView({ duration: 200, padding: 0.2 });
      },
    },
    {
      icon: Grid3X3,
      label: snapToGrid ? "Disable snap to grid" : "Enable snap to grid",
      shortcut: "Ctrl+G",
      onClick: onToggleSnapToGrid,
      active: snapToGrid,
    },
    {
      icon: editable ? Unlock : Lock,
      label: editable ? "Lock canvas" : "Unlock canvas",
      shortcut: "Ctrl+L",
      onClick: onToggleEditable,
      active: !editable,
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
        className={cn(
          "absolute z-10",
          controlsPositionClasses[position],
          "flex flex-col gap-1",
          "rounded-lg border bg-card/95 p-1 backdrop-blur-sm",
          "shadow-lg",
          className,
        )}
      >
        {showAddNode && api && paletteTypes.length > 0 && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">Add node</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">Add node</TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="start">
              {paletteTypes.map((nodeType) => (
                <DropdownMenuItem
                  key={nodeType.type}
                  onClick={() => {
                    api.createNode(
                      nodeType.type,
                      addNodePosition ?? {
                        x: 120 + Math.random() * 80,
                        y: 120 + Math.random() * 80,
                      },
                    );
                  }}
                >
                  {nodeType.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {controls.map(({ icon: Icon, label, shortcut, onClick, active }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", active && "bg-muted text-primary")}
                onClick={onClick}
              >
                <Icon className="h-4 w-4" />
                <span className="sr-only">{label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="flex items-center gap-2">
              <span>{label}</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                {shortcut}
              </kbd>
            </TooltipContent>
          </Tooltip>
        ))}
      </motion.div>
    </TooltipProvider>
  );
}

export const CanvasControls = memo(CanvasControlsComponent);

// --- Workflow canvas ---

const edgeTypes = {
  default: WorkflowEdge,
} satisfies EdgeTypes;

const defaultEdgeOptions = {
  type: "default",
  animated: true,
  style: {
    stroke: "var(--muted-foreground)",
    strokeOpacity: 0.55,
    strokeWidth: 2,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 15,
    height: 15,
    color: "var(--muted-foreground)",
  },
};

const connectionLineStyle = {
  strokeWidth: 2,
  stroke: "var(--primary)",
};

/** React Flow `screenToFlowPosition` expects viewport coordinates (`clientX` / `clientY`). */
function screenPointFromClient(
  clientX: number,
  clientY: number,
): WorkflowPosition {
  return { x: clientX, y: clientY };
}

function menuPointFromClient(
  clientX: number,
  clientY: number,
  wrapper: HTMLDivElement | null,
): WorkflowPosition {
  const rect = wrapper?.getBoundingClientRect();
  return {
    x: clientX - (rect?.left ?? 0),
    y: clientY - (rect?.top ?? 0),
  };
}

function commitStateUpdate<T>(
  setState: Dispatch<SetStateAction<T[]>>,
  buildNext: (current: T[]) => T[],
): T[] {
  let next: T[] = [];
  setState((current) => {
    next = buildNext(current);
    return next;
  });
  return next;
}

function shouldNotifyNodesChange(
  changes: NodeChange<Node<WorkflowNodeData>>[],
): boolean {
  return changes.some((change) => {
    if (change.type === "dimensions" || change.type === "select") {
      return false;
    }
    if (change.type === "position" && change.dragging) {
      return false;
    }
    return true;
  });
}

function resolveContainerHeight(
  height?: string | number,
): CSSProperties | undefined {
  if (height === undefined) return undefined;
  return {
    height: typeof height === "number" ? `${height}px` : height,
  };
}

function FlowHelpersRefSetter({
  helpersRef,
}: {
  helpersRef: RefObject<Partial<FlowHelpers>>;
}) {
  const {
    screenToFlowPosition,
    flowToScreenPosition,
    zoomIn,
    zoomOut,
    fitView,
  } = useReactFlow();

  useEffect(() => {
    helpersRef.current = {
      screenToFlowPosition,
      flowToScreenPosition,
      zoomIn,
      zoomOut,
      fitView,
    };
  }, [
    fitView,
    flowToScreenPosition,
    helpersRef,
    screenToFlowPosition,
    zoomIn,
    zoomOut,
  ]);

  return null;
}

function getMinimapNodeCenter(node: ReactFlowWorkflowNode): WorkflowPosition {
  const width = node.measured?.width ?? node.width ?? 0;
  const height = node.measured?.height ?? node.height ?? 0;

  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  };
}

function WorkflowCanvasMinimap({
  minimapOptions,
}: {
  minimapOptions?: WorkflowMinimapOptions;
}) {
  const { setCenter, getZoom } = useReactFlow();
  const panMomentum = usePanMomentum();

  const snapViewportTo = useCallback(
    (position: WorkflowPosition) => {
      panMomentum?.stopMomentum();
      void setCenter(position.x, position.y, {
        duration: 200,
        zoom: getZoom(),
      });
    },
    [getZoom, panMomentum, setCenter],
  );

  const handleMinimapClick = useCallback(
    (_event: ReactMouseEvent, position: WorkflowPosition) => {
      snapViewportTo(position);
    },
    [snapViewportTo],
  );

  const handleMinimapNodeClick = useCallback(
    (_event: ReactMouseEvent, node: ReactFlowWorkflowNode) => {
      snapViewportTo(getMinimapNodeCenter(node));
    },
    [snapViewportTo],
  );

  return (
    <MiniMap
      style={minimapOptions?.style}
      nodeColor={
        minimapOptions?.nodeColor ?? (() => "var(--foreground)")
      }
      maskColor={minimapOptions?.maskColor}
      className={minimapOptions?.className}
      pannable
      zoomable
      onClick={handleMinimapClick}
      onNodeClick={handleMinimapNodeClick}
    />
  );
}

type WorkflowCanvasBridgeProps = {
  imperativeRef: Ref<WorkflowCanvasHandle>;
  flowHelpersRef: RefObject<Partial<FlowHelpers>>;
  stopPanMomentumRef: RefObject<(() => void) | undefined>;
};

function WorkflowCanvasBridge({
  imperativeRef,
  flowHelpersRef,
  stopPanMomentumRef,
}: WorkflowCanvasBridgeProps) {
  const actions = useWorkflowCanvasActions();

  useImperativeHandle(
    imperativeRef,
    () => ({
      addNode: actions.applyAddNode,
      createNode: actions.createNode,
      getNodes: actions.getNodes,
      getEdges: actions.getEdges,
      validateGraph: actions.validateGraph,
      fitView: (options) => {
        stopPanMomentumRef.current?.();
        flowHelpersRef.current.fitView?.({
          padding: options?.padding ?? 0.2,
          duration: options?.duration ?? 200,
        });
      },
      zoomIn: () => {
        stopPanMomentumRef.current?.();
        flowHelpersRef.current.zoomIn?.({ duration: 200 });
      },
      zoomOut: () => {
        stopPanMomentumRef.current?.();
        flowHelpersRef.current.zoomOut?.({ duration: 200 });
      },
      screenToFlowPosition: (point) =>
        flowHelpersRef.current.screenToFlowPosition?.(point) ?? point,
    }),
    [actions, flowHelpersRef, stopPanMomentumRef],
  );

  return null;
}

function WorkflowNodePickerLayer({
  anchor,
  renderNodePicker,
  onClose,
  applyAddNode,
}: {
  anchor: PickerAnchorState;
  renderNodePicker: (args: WorkflowNodePickerRenderProps) => ReactNode;
  onClose: () => void;
  applyAddNode: (node: WorkflowNode) => void;
}) {
  const backdropRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    backdropRef.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={backdropRef}
        type="button"
        aria-label="Close node picker"
        className="absolute inset-0 z-40 cursor-default border-0 bg-transparent p-0 outline-none"
        onClick={onClose}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      />
      <div
        data-workflow-node-picker
        className="pointer-events-auto absolute z-50"
        style={{ left: anchor.menu.x, top: anchor.menu.y }}
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
      >
        {renderNodePicker({
          position: anchor.flow,
          addNode: applyAddNode,
          close: onClose,
        })}
      </div>
    </>
  );
}

const WorkflowCanvasContent = forwardRef<
  WorkflowCanvasHandle,
  WorkflowCanvasProps
>(function WorkflowCanvasContent(
  {
    nodes: externalNodes,
    edges: externalEdges,
    editable = true,
    height,
    autoFitView = false,
    nodeRegistry: nodeRegistryProp,
    iconMap,
    nodeTypes: nodeTypesProp,
    classNames,
    panOnDrag = true,
    minimap,
    minimapOptions,
    controls,
    controlsPosition = "bottom-left",
    onAddNode,
    onPaneContextMenu,
    renderNodePicker,
    onNodeDrop,
    renderControls,
    showAddNodeInControls,
    onNodesChange: onExternalNodesChange,
    onEdgesChange: onExternalEdgesChange,
    onConnect: onExternalConnect,
    isValidConnection: isValidConnectionProp,
    preventCycles = false,
    validationOptions,
    validateOnChange = false,
    onValidationChange,
    onNodeSelect,
    onNodeDoubleClick,
    background = true,
    className,
  },
  ref,
) {
  const mergedNodeRegistry = useMemo(
    () => nodeRegistryProp ?? {},
    [nodeRegistryProp],
  );

  const mergedValidationOptions = useMemo<ValidateGraphOptions>(
    () => ({
      ...validationOptions,
      registry: validationOptions?.registry ?? mergedNodeRegistry,
      isValidConnection:
        validationOptions?.isValidConnection ?? isValidConnectionProp,
      preventCycles: validationOptions?.preventCycles ?? preventCycles,
    }),
    [validationOptions, mergedNodeRegistry, isValidConnectionProp, preventCycles],
  );

  const shouldValidateOnChange = validateOnChange || onValidationChange != null;

  const [validationResult, setValidationResult] =
    useState<WorkflowGraphValidationResult>(createEmptyValidationResult);

  const resolvedNodeTypes = useMemo(
    () => ({ unknown: UnknownFlowNode, ...nodeTypesProp }),
    [nodeTypesProp],
  );

  const canvasConfig = useMemo<WorkflowCanvasConfigValue>(
    () => ({
      nodeRegistry: mergedNodeRegistry,
      iconMap: iconMap ?? {},
      classNames,
      validation: shouldValidateOnChange ? validationResult : undefined,
    }),
    [
      classNames,
      iconMap,
      mergedNodeRegistry,
      shouldValidateOnChange,
      validationResult,
    ],
  );

  const containerStyle = useMemo(
    () => resolveContainerHeight(height),
    [height],
  );
  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>(() =>
    toReactFlowNodes(externalNodes, resolvedNodeTypes),
  );
  const [edges, setEdges] = useState<Edge[]>(() =>
    toReactFlowEdges(externalEdges),
  );
  const [isEditable, setIsEditable] = useState(editable);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState<PickerAnchorState | null>(
    null,
  );
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const flowHelpersRef = useRef<Partial<FlowHelpers>>({});
  const stopPanMomentumRef = useRef<(() => void) | undefined>(undefined);
  const skipExternalSyncRef = useRef(false);

  const closePicker = useCallback(() => setPickerAnchor(null), []);

  const notifyExternalGraphChange = useCallback(
    (next?: { nodes?: Node<WorkflowNodeData>[]; edges?: Edge[] }) => {
      skipExternalSyncRef.current = true;

      const domainNodes = next?.nodes
        ? fromReactFlowNodes(next.nodes)
        : fromReactFlowNodes(nodes);
      const domainEdges = next?.edges
        ? fromReactFlowEdges(next.edges)
        : fromReactFlowEdges(edges);

      if (next?.nodes) {
        onExternalNodesChange?.(domainNodes);
      }
      if (next?.edges) {
        onExternalEdgesChange?.(domainEdges);
      }

      if (shouldValidateOnChange) {
        const result = runValidateGraph(
          domainNodes,
          domainEdges,
          mergedValidationOptions,
        );
        setValidationResult(result);
        onValidationChange?.(result);
      }
    },
    [
      edges,
      mergedValidationOptions,
      nodes,
      onExternalEdgesChange,
      onExternalNodesChange,
      onValidationChange,
      shouldValidateOnChange,
    ],
  );

  const applyAddNode = useCallback(
    (node: WorkflowNode) => {
      if (!isEditable) return;

      const rfNode = toReactFlowNodes([node], resolvedNodeTypes)[0];
      const updatedNodes = commitStateUpdate(setNodes, (current) => [
        ...current,
        rfNode,
      ]);

      onAddNode?.(node);
      notifyExternalGraphChange({ nodes: updatedNodes });
    },
    [isEditable, notifyExternalGraphChange, onAddNode, resolvedNodeTypes],
  );

  const createNode = useCallback(
    (type: WorkflowNodeType, position?: WorkflowPosition) => {
      const node = createWorkflowNode(type, position, mergedNodeRegistry);
      applyAddNode(node);
      return node;
    },
    [applyAddNode, mergedNodeRegistry],
  );

  const removeEdge = useCallback(
    (edgeId: string) => {
      if (!isEditable) return;

      const updatedEdges = commitStateUpdate(setEdges, (current) =>
        current.filter((edge) => edge.id !== edgeId),
      );

      notifyExternalGraphChange({ edges: updatedEdges });
    },
    [isEditable, notifyExternalGraphChange],
  );

  const runCanvasValidateGraph = useCallback(
    (overrideOptions?: ValidateGraphOptions) =>
      runValidateGraph(
        fromReactFlowNodes(nodes),
        fromReactFlowEdges(edges),
        { ...mergedValidationOptions, ...overrideOptions },
      ),
    [edges, mergedValidationOptions, nodes],
  );

  const actionsValue = useMemo<WorkflowCanvasActionsValue>(
    () => ({
      applyAddNode,
      createNode,
      getNodes: () => fromReactFlowNodes(nodes),
      getEdges: () => fromReactFlowEdges(edges),
      validateGraph: runCanvasValidateGraph,
      removeEdge,
      mergedNodeRegistry,
      isEditable,
    }),
    [
      applyAddNode,
      createNode,
      edges,
      isEditable,
      mergedNodeRegistry,
      nodes,
      removeEdge,
      runCanvasValidateGraph,
    ],
  );

  const canvasApi = useMemo<WorkflowCanvasAPI>(
    () => ({
      addNode: applyAddNode,
      createNode,
      getNodes: () => fromReactFlowNodes(nodes),
      getEdges: () => fromReactFlowEdges(edges),
      validateGraph: runCanvasValidateGraph,
      fitView: (options) => {
        stopPanMomentumRef.current?.();
        flowHelpersRef.current.fitView?.({
          padding: options?.padding ?? 0.2,
          duration: options?.duration ?? 200,
        });
      },
      zoomIn: () => {
        stopPanMomentumRef.current?.();
        flowHelpersRef.current.zoomIn?.({ duration: 200 });
      },
      zoomOut: () => {
        stopPanMomentumRef.current?.();
        flowHelpersRef.current.zoomOut?.({ duration: 200 });
      },
      screenToFlowPosition: (point) =>
        flowHelpersRef.current.screenToFlowPosition?.(point) ?? point,
    }),
    [applyAddNode, createNode, edges, runCanvasValidateGraph, nodes],
  );

  useEffect(() => {
    if (!shouldValidateOnChange) return;

    const result = runValidateGraph(
      externalNodes,
      externalEdges,
      mergedValidationOptions,
    );
    setValidationResult(result);
    onValidationChange?.(result);
  }, [
    externalEdges,
    externalNodes,
    mergedValidationOptions,
    onValidationChange,
    shouldValidateOnChange,
  ]);

  useEffect(() => {
    if (skipExternalSyncRef.current) {
      skipExternalSyncRef.current = false;
      return;
    }

    setNodes((current) => {
      if (
        reactFlowNodesMatchExternal(
          current,
          externalNodes,
          resolvedNodeTypes,
        )
      ) {
        return current;
      }
      return toReactFlowNodes(externalNodes, resolvedNodeTypes);
    });

    setEdges((current) => {
      if (reactFlowEdgesMatchExternal(current, externalEdges)) {
        return current;
      }
      return toReactFlowEdges(externalEdges);
    });
  }, [externalEdges, externalNodes, resolvedNodeTypes]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<WorkflowNodeData>>[]) => {
      if (!isEditable) {
        const internalChanges = changes.filter(
          (change) => change.type === "dimensions" || change.type === "select",
        );
        if (internalChanges.length === 0) return;

        commitStateUpdate(setNodes, (current) =>
          applyNodeChanges(internalChanges, current),
        );
        return;
      }

      const removedIds = new Set(
        changes
          .filter((change) => change.type === "remove")
          .map((change) => change.id),
      );

      const updatedNodes = commitStateUpdate(setNodes, (current) =>
        applyNodeChanges(changes, current),
      );

      let updatedEdges: Edge[] | null = null;

      if (removedIds.size > 0) {
        updatedEdges = commitStateUpdate(setEdges, (current) =>
          current.filter(
            (edge) =>
              !removedIds.has(edge.source) && !removedIds.has(edge.target),
          ),
        );
      }

      const shouldNotifyNodes = shouldNotifyNodesChange(changes);

      if (shouldNotifyNodes || updatedEdges !== null) {
        notifyExternalGraphChange({
          nodes: shouldNotifyNodes ? updatedNodes : undefined,
          edges: updatedEdges ?? undefined,
        });
      }
    },
    [isEditable, notifyExternalGraphChange],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      if (!isEditable) return;

      const updatedEdges = commitStateUpdate(setEdges, (current) =>
        applyEdgeChanges(changes, current),
      );

      const shouldNotifyExternal = changes.some(
        (change) => change.type !== "select",
      );

      if (shouldNotifyExternal) {
        notifyExternalGraphChange({ edges: updatedEdges });
      }
    },
    [isEditable, notifyExternalGraphChange],
  );

  const isValidConnection = useMemo<IsValidConnection>(
    () =>
      createIsValidConnection({
        getNodes: () => fromReactFlowNodes(nodes),
        getEdges: () => fromReactFlowEdges(edges),
        registry: mergedNodeRegistry,
        preventCycles,
        user: isValidConnectionProp,
      }),
    [edges, nodes, mergedNodeRegistry, isValidConnectionProp, preventCycles],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isEditable) return;
      if (!isValidConnection(connection)) return;

      onExternalConnect?.(connection);

      const newEdge: Edge = {
        ...connection,
        id: createWorkflowEdgeId(connection.source, connection.target),
        type: "default",
        animated: true,
      };

      const updatedEdges = commitStateUpdate(setEdges, (current) =>
        addEdge(newEdge, current),
      );

      notifyExternalGraphChange({ edges: updatedEdges });
    },
    [isEditable, isValidConnection, notifyExternalGraphChange, onExternalConnect],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node<WorkflowNodeData>[] }) => {
      if (selectedNodes.length === 1) {
        onNodeSelect?.(fromReactFlowNode(selectedNodes[0]));
      } else {
        onNodeSelect?.(null);
      }
    },
    [onNodeSelect],
  );

  const handleNodeDoubleClick = useCallback(
    (_event: ReactMouseEvent, node: Node<WorkflowNodeData>) => {
      onNodeDoubleClick?.(fromReactFlowNode(node));
    },
    [onNodeDoubleClick],
  );

  const resolveFlowPosition = useCallback(
    (clientX: number, clientY: number) => {
      const screen = screenPointFromClient(clientX, clientY);
      return (
        flowHelpersRef.current.screenToFlowPosition?.(screen) ?? {
          x: clientX,
          y: clientY,
        }
      );
    },
    [],
  );

  const openPaneContextMenuAtScreen = useCallback(
    (clientX: number, clientY: number, nativeEvent: MouseEvent) => {
      const flow = resolveFlowPosition(clientX, clientY);

      if (renderNodePicker) {
        setPickerAnchor({
          flow,
          menu: menuPointFromClient(clientX, clientY, canvasWrapperRef.current),
        });
      }

      onPaneContextMenu?.(flow, nativeEvent);
    },
    [onPaneContextMenu, renderNodePicker, resolveFlowPosition],
  );

  const handlePaneContextMenu = useCallback(
    (event: ReactMouseEvent | MouseEvent) => {
      if (renderNodePicker && "preventDefault" in event) {
        event.preventDefault();
      }
      const nativeEvent = "nativeEvent" in event ? event.nativeEvent : event;
      openPaneContextMenuAtScreen(event.clientX, event.clientY, nativeEvent);
    },
    [openPaneContextMenuAtScreen, renderNodePicker],
  );

  const handleCanvasKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.ctrlKey && event.key === "g") {
        event.preventDefault();
        setSnapToGrid((snap) => !snap);
      }

      if (event.ctrlKey && event.key === "l") {
        event.preventDefault();
        setIsEditable((editableState) => !editableState);
      }
    },
    [],
  );

  const handlePaneClick = useCallback(() => {
    if (pickerAnchor) closePicker();
  }, [closePicker, pickerAnchor]);

  const handleDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      if (!onNodeDrop) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    [onNodeDrop],
  );

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      if (!onNodeDrop || !isEditable) return;
      event.preventDefault();
      const type = event.dataTransfer.getData(
        WORKFLOW_NODE_DRAG_TYPE,
      ) as WorkflowNodeType;
      if (!type) return;
      const position = resolveFlowPosition(event.clientX, event.clientY);
      onNodeDrop(event.nativeEvent, position, type);
    },
    [isEditable, onNodeDrop, resolveFlowPosition],
  );

  const shouldRenderDefaultMinimap =
    minimap !== false && (minimap === true || minimap === undefined);

  const minimapSlot =
    minimap !== undefined && minimap !== true && minimap !== false
      ? minimap
      : null;

  const allNodeTypes = useMemo(
    () => getAllNodeTypes(mergedNodeRegistry),
    [mergedNodeRegistry],
  );

  const defaultControls =
    renderControls !== undefined ? (
      <div
        className={cn(
          "absolute z-10",
          controlsPositionClasses[controlsPosition],
          classNames?.controls,
        )}
      >
        {renderControls(canvasApi)}
      </div>
    ) : controls === undefined ? (
      <CanvasControls
        editable={isEditable}
        onToggleEditable={() => setIsEditable((e) => !e)}
        onToggleSnapToGrid={() => setSnapToGrid((s) => !s)}
        snapToGrid={snapToGrid}
        position={controlsPosition}
        className={classNames?.controls}
        api={canvasApi}
        showAddNode={showAddNodeInControls}
        paletteTypes={allNodeTypes}
        addNodePosition={pickerAnchor?.flow}
      />
    ) : null;

  return (
    <WorkflowCanvasConfigContext.Provider value={canvasConfig}>
      <WorkflowCanvasActionsContext.Provider value={actionsValue}>
        <div
          ref={canvasWrapperRef}
          tabIndex={-1}
          onKeyDown={handleCanvasKeyDown}
          className={cn(
            "relative w-full overflow-hidden rounded-lg border outline-none",
            height === undefined && "h-full min-h-[360px]",
            classNames?.canvas,
            className,
          )}
          style={containerStyle}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onSelectionChange={onSelectionChange}
            onNodeDoubleClick={
              onNodeDoubleClick ? handleNodeDoubleClick : undefined
            }
            onPaneClick={pickerAnchor ? handlePaneClick : undefined}
            onPaneContextMenu={
              onPaneContextMenu || renderNodePicker
                ? handlePaneContextMenu
                : undefined
            }
            onDragOver={onNodeDrop ? handleDragOver : undefined}
            onDrop={onNodeDrop ? handleDrop : undefined}
            nodeTypes={resolvedNodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionLineType={ConnectionLineType.Bezier}
            connectionLineStyle={connectionLineStyle}
            selectionMode={SelectionMode.Partial}
            snapToGrid={snapToGrid}
            snapGrid={[16, 16]}
            fitView={autoFitView}
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
            nodesDraggable={isEditable}
            nodesConnectable={isEditable}
            elementsSelectable
            deleteKeyCode={isEditable ? ["Delete", "Backspace"] : null}
            multiSelectionKeyCode={["Shift"]}
            panOnScroll
            zoomOnScroll
            panOnDrag={panOnDrag}
            selectNodesOnDrag={false}
            onlyRenderVisibleElements={false}
            className="workflow-canvas h-full w-full"
            proOptions={{ hideAttribution: true }}
          >
            <PanMomentumProvider stopRef={stopPanMomentumRef}>
              <FlowHelpersRefSetter helpersRef={flowHelpersRef} />
              <WorkflowCanvasBridge
                imperativeRef={ref}
                flowHelpersRef={flowHelpersRef}
                stopPanMomentumRef={stopPanMomentumRef}
              />

              {background && (
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={16}
                  size={1}
                  color="hsl(var(--muted-foreground) / 0.15)"
                />
              )}

              {minimapSlot}

              {shouldRenderDefaultMinimap && !minimapSlot && (
                <WorkflowCanvasMinimap minimapOptions={minimapOptions} />
              )}

              {controls !== undefined ? (
                <div
                  className={cn(
                    "absolute z-10",
                    controlsPositionClasses[controlsPosition],
                    classNames?.controls,
                  )}
                >
                  {controls}
                </div>
              ) : (
                defaultControls
              )}
            </PanMomentumProvider>
          </ReactFlow>

          {pickerAnchor && renderNodePicker && (
            <WorkflowNodePickerLayer
              anchor={pickerAnchor}
              renderNodePicker={renderNodePicker}
              onClose={closePicker}
              applyAddNode={applyAddNode}
            />
          )}
        </div>
      </WorkflowCanvasActionsContext.Provider>
    </WorkflowCanvasConfigContext.Provider>
  );
});

export const WorkflowCanvas = forwardRef<
  WorkflowCanvasHandle,
  WorkflowCanvasProps
>(function WorkflowCanvas(props, ref) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasContent {...props} ref={ref} />
    </ReactFlowProvider>
  );
});
