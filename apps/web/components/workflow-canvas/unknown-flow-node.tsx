"use client";

import { memo } from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useWorkflowCanvasConfig } from "./workflow-canvas-context";
import { ORIGINAL_TYPE_DATA_KEY } from "./workflow-canvas-graph";
import {
  resolveNodeHandles,
  WorkflowNodeHandles,
} from "./workflow-canvas-handles";
import { resolveNodeTypeConfig } from "./workflow-canvas-registry";
import type { WorkflowNodeData } from "./workflow-canvas-types";

function UnknownFlowNodeComponent({
  data,
  selected,
  type,
  isConnectable = true,
}: NodeProps<Node<WorkflowNodeData>>) {
  const { nodeRegistry } = useWorkflowCanvasConfig();
  const originalType =
    typeof data[ORIGINAL_TYPE_DATA_KEY] === "string"
      ? (data[ORIGINAL_TYPE_DATA_KEY] as string)
      : undefined;
  const displayType = originalType ?? type ?? "unknown";
  const title = data.label || displayType;
  const description =
    data.description ??
    (originalType ? `No renderer registered for "${originalType}"` : undefined);
  const config = resolveNodeTypeConfig(originalType ?? displayType, nodeRegistry);
  const handles = resolveNodeHandles(config, data);

  return (
    <div
      className={cn(
        "relative min-w-[180px] max-w-[240px] rounded-lg border border-dashed",
        "border-muted-foreground/40 bg-muted/40 px-3 py-2.5",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      <WorkflowNodeHandles
        handles={handles}
        isConnectable={isConnectable}
        className="size-3! rounded-full border-2 border-background bg-muted-foreground"
      />

      <div className="space-y-0.5">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        ) : null}
        {originalType ? (
          <p className="truncate font-mono text-[10px] text-muted-foreground/80">
            {originalType}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export const UnknownFlowNode = memo(UnknownFlowNodeComponent);
