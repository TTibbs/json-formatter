"use client";

import { memo, useMemo, type CSSProperties } from "react";
import { Handle, Position } from "@xyflow/react";
import type {
  NodeTypeConfig,
  WorkflowHandleConfig,
  WorkflowNodeData,
} from "./workflow-canvas-types";

export function resolveNodeHandles(
  config: NodeTypeConfig,
  data?: WorkflowNodeData,
): WorkflowHandleConfig[] {
  return data?.handles ?? config.handles;
}

export function layoutHandleStyles(
  handles: WorkflowHandleConfig[],
): Record<string, CSSProperties> {
  const styles: Record<string, CSSProperties> = {};
  const byPosition = new Map<Position, WorkflowHandleConfig[]>();

  for (const handle of handles) {
    const group = byPosition.get(handle.position) ?? [];
    group.push(handle);
    byPosition.set(handle.position, group);
  }

  for (const group of byPosition.values()) {
    const autoLayout = group.filter((handle) => handle.style?.top == null);

    if (autoLayout.length > 1) {
      autoLayout.forEach((handle, index) => {
        const top = `${((index + 1) / (autoLayout.length + 1)) * 100}%`;
        styles[handle.id] = { ...handle.style, top };
      });
    }

    for (const handle of group) {
      if (!styles[handle.id]) {
        styles[handle.id] = handle.style ?? {};
      }
    }
  }

  return styles;
}

type WorkflowNodeHandlesProps = {
  handles: WorkflowHandleConfig[];
  isConnectable?: boolean;
  className?: string;
};

function WorkflowNodeHandlesComponent({
  handles,
  isConnectable = true,
  className,
}: WorkflowNodeHandlesProps) {
  const handleStyles = useMemo(() => layoutHandleStyles(handles), [handles]);

  return (
    <>
      {handles.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          isConnectable={isConnectable}
          style={handleStyles[handle.id]}
          className={className}
        />
      ))}
    </>
  );
}

export const WorkflowNodeHandles = memo(WorkflowNodeHandlesComponent);
