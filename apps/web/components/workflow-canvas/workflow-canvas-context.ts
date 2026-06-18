import { createContext, useContext } from "react";
import type { WorkflowCanvasConfigValue } from "./workflow-canvas-types";

export const WorkflowCanvasConfigContext =
  createContext<WorkflowCanvasConfigValue | null>(null);

export function useWorkflowCanvasConfig(): WorkflowCanvasConfigValue {
  const context = useContext(WorkflowCanvasConfigContext);
  return (
    context ?? {
      nodeRegistry: {},
      iconMap: {},
    }
  );
}
