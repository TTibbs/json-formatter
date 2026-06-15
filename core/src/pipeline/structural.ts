import { deleteAtPath, moveAtPath } from "../parser/path-mutate";
import { resolvePath } from "../parser/path";
import type {
  JsonValue,
  MoveStep,
  PipelineStep,
  RemoveStep,
  RenameStep,
  TransformError,
  TransformErrorType,
} from "../types/index";

export function applyMove(
  target: Record<string, JsonValue>,
  step: MoveStep,
  errors: TransformError[],
  stepPath: string,
): void {
  const result = moveAtPath(target, step.from, step.to);
  if (!result.ok) {
    errors.push({
      type: result.reason as TransformErrorType,
      message:
        result.reason === "PATH_NOT_FOUND"
          ? `Path "${step.from}" not found`
          : result.reason === "STRUCTURAL_CONFLICT"
            ? `Target path "${step.to}" already exists`
            : `Cannot move "${step.from}" to "${step.to}"`,
      path: result.reason === "PATH_NOT_FOUND" ? step.from : step.to,
      outputField: stepPath,
    });
  }
}

export function applyRename(
  target: Record<string, JsonValue>,
  step: RenameStep,
  errors: TransformError[],
  stepPath: string,
): void {
  applyMove(
    target,
    { type: "move", from: step.from, to: step.to },
    errors,
    stepPath,
  );
}

export function applyRemove(
  target: Record<string, JsonValue>,
  step: RemoveStep,
  errors: TransformError[],
  stepPath: string,
): void {
  const result = deleteAtPath(target, step.path);
  if (!result.ok) {
    errors.push({
      type: "PATH_NOT_FOUND",
      message: `Path "${step.path}" not found`,
      path: step.path,
      outputField: stepPath,
    });
  }
}

export function applyStructuralStep(
  target: Record<string, JsonValue>,
  step: Exclude<PipelineStep, { type: "foreach" }>,
  errors: TransformError[],
  stepPath: string,
): void {
  switch (step.type) {
    case "move":
      applyMove(target, step, errors, stepPath);
      break;
    case "rename":
      applyRename(target, step, errors, stepPath);
      break;
    case "remove":
      applyRemove(target, step, errors, stepPath);
      break;
  }
}

export function asMutableObject(
  value: unknown,
  errors: TransformError[],
  stepPath: string,
): Record<string, JsonValue> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    errors.push({
      type: "TYPE_MISMATCH",
      message: "Expected an object to mutate",
      outputField: stepPath,
    });
    return null;
  }
  return value as Record<string, JsonValue>;
}

export function resolveArrayAt(
  context: { current: unknown },
  source: string,
): unknown[] | null {
  const resolved = resolvePath(context.current, source);
  if (!Array.isArray(resolved)) return null;
  return resolved;
}
