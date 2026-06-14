import { resolvePath } from "../parser/path";
import type {
  Context,
  ForeachStep,
  JsonValue,
  PipelineStep,
  TransformError,
} from "../types/index";
import {
  applyStructuralStep,
  asMutableObject,
} from "./structural";

export interface RunPipelineResult {
  document: JsonValue;
  errors: TransformError[];
}

/**
 * Execute a normalized pipeline on a deep-cloned document.
 * Never throws — failures are recorded in `errors`.
 */
export function runPipeline(
  document: JsonValue,
  steps: PipelineStep[],
): RunPipelineResult {
  const errors: TransformError[] = [];
  const context: Context = { root: document, current: document };

  runSteps(steps, context, errors, "$pipeline");

  return { document, errors };
}

function runSteps(
  steps: PipelineStep[],
  context: Context,
  errors: TransformError[],
  basePath: string,
): void {
  for (let i = 0; i < steps.length; i++) {
    runStep(steps[i]!, context, errors, `${basePath}[${i}]`);
  }
}

function runStep(
  step: PipelineStep,
  context: Context,
  errors: TransformError[],
  stepPath: string,
): void {
  if (step.type === "foreach") {
    runForeach(step, context, errors, stepPath);
    return;
  }

  const target = asMutableObject(context.current, errors, stepPath);
  if (!target) return;

  applyStructuralStep(target, step, errors, stepPath);
}

function runForeach(
  step: ForeachStep,
  context: Context,
  errors: TransformError[],
  stepPath: string,
): void {
  const sourceValue = resolvePath(context.current, step.source);

  if (sourceValue === undefined || sourceValue === null) {
    return;
  }

  if (!Array.isArray(sourceValue)) {
    errors.push({
      type: "TYPE_MISMATCH",
      message: `Foreach source "${step.source}" is not an array`,
      path: step.source,
      outputField: stepPath,
    });
    return;
  }

  for (let i = 0; i < sourceValue.length; i++) {
    const item = sourceValue[i];

    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      errors.push({
        type: "TYPE_MISMATCH",
        message: `Foreach item at ${step.source}[${i}] is not an object`,
        path: `${step.source}[${i}]`,
        outputField: `${stepPath}[${i}]`,
      });
      continue;
    }

    const itemContext: Context = {
      root: context.root,
      current: item,
    };

    runSteps(step.steps, itemContext, errors, `${stepPath}[${i}]`);
  }
}
