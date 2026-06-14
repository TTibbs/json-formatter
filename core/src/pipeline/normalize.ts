import type { JsonValue, PipelineStep, TransformError } from "../types/index";

export interface NormalizePipelineResult {
  steps: PipelineStep[];
  errors: TransformError[];
}

/**
 * Parse a raw `$pipeline` array into typed pipeline steps.
 * Never throws — invalid steps are reported in `errors`.
 */
export function normalizePipeline(raw: unknown): NormalizePipelineResult {
  const errors: TransformError[] = [];

  if (!Array.isArray(raw)) {
    errors.push({
      type: "DSL_INVALID",
      message: "$pipeline must be an array of steps",
    });
    return { steps: [], errors };
  }

  const steps: PipelineStep[] = [];
  for (let i = 0; i < raw.length; i++) {
    const step = normalizeStep(raw[i], errors, `$pipeline[${i}]`);
    if (step) steps.push(step);
  }

  return { steps, errors };
}

function normalizeStep(
  raw: unknown,
  errors: TransformError[],
  stepPath: string,
): PipelineStep | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    errors.push({
      type: "DSL_INVALID",
      message: "Pipeline step must be an object",
      outputField: stepPath,
    });
    return null;
  }

  const obj = raw as Record<string, unknown>;

  if ("foreach" in obj) {
    return normalizeForeach(obj, errors, stepPath);
  }

  const keys = Object.keys(obj);

  if (keys.length !== 1) {
    errors.push({
      type: "DSL_INVALID",
      message: "Pipeline step must have exactly one operation key",
      outputField: stepPath,
    });
    return null;
  }

  const op = keys[0]!;

  if (op === "move") {
    return normalizeMove(obj.move, errors, stepPath);
  }

  if (op === "rename") {
    return normalizeRename(obj.rename, errors, stepPath);
  }

  if (op === "remove") {
    return normalizeRemove(obj.remove, errors, stepPath);
  }

  errors.push({
    type: "DSL_INVALID",
    message: `Unknown pipeline operation "${op}"`,
    outputField: stepPath,
  });
  return null;
}

function normalizeForeach(
  obj: Record<string, unknown>,
  errors: TransformError[],
  stepPath: string,
): PipelineStep | null {
  const source = obj.foreach;

  if (typeof source !== "string" || source.length === 0) {
    errors.push({
      type: "DSL_INVALID",
      message: '"foreach" requires a non-empty source path string',
      outputField: stepPath,
    });
    return null;
  }

  const stepsRaw = obj.steps;

  if (!Array.isArray(stepsRaw)) {
    errors.push({
      type: "DSL_INVALID",
      message: '"foreach" requires a "steps" array',
      outputField: stepPath,
    });
    return null;
  }

  const steps: PipelineStep[] = [];
  for (let i = 0; i < stepsRaw.length; i++) {
    const step = normalizeStep(stepsRaw[i], errors, `${stepPath}.steps[${i}]`);
    if (step) steps.push(step);
  }

  return { type: "foreach", source, steps };
}

function normalizeMove(
  raw: unknown,
  errors: TransformError[],
  stepPath: string,
): PipelineStep | null {
  const fields = readFromTo(raw, errors, stepPath, "move");
  if (!fields) return null;
  return { type: "move", ...fields };
}

function normalizeRename(
  raw: unknown,
  errors: TransformError[],
  stepPath: string,
): PipelineStep | null {
  const fields = readFromTo(raw, errors, stepPath, "rename");
  if (!fields) return null;
  return { type: "rename", ...fields };
}

function normalizeRemove(
  raw: unknown,
  errors: TransformError[],
  stepPath: string,
): PipelineStep | null {
  if (typeof raw !== "string" || raw.length === 0) {
    errors.push({
      type: "DSL_INVALID",
      message: '"remove" must be a non-empty path string',
      outputField: stepPath,
    });
    return null;
  }
  return { type: "remove", path: raw };
}

function readFromTo(
  raw: unknown,
  errors: TransformError[],
  stepPath: string,
  op: string,
): { from: string; to: string } | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    errors.push({
      type: "DSL_INVALID",
      message: `"${op}" must be an object with "from" and "to"`,
      outputField: stepPath,
    });
    return null;
  }

  const obj = raw as Record<string, unknown>;
  if (typeof obj.from !== "string" || typeof obj.to !== "string") {
    errors.push({
      type: "DSL_INVALID",
      message: `"${op}" requires string "from" and "to" paths`,
      outputField: stepPath,
    });
    return null;
  }

  return { from: obj.from, to: obj.to };
}

/** Extract `$pipeline` from a top-level DSL object, if present. */
export function extractPipeline(dsl: JsonValue): {
  pipeline: unknown | undefined;
  outputDsl: JsonValue;
} {
  if (typeof dsl !== "object" || dsl === null || Array.isArray(dsl)) {
    return { pipeline: undefined, outputDsl: dsl };
  }

  const obj = dsl as Record<string, JsonValue>;
  if (!("$pipeline" in obj)) {
    return { pipeline: undefined, outputDsl: dsl };
  }

  const { $pipeline, ...rest } = obj;
  return { pipeline: $pipeline, outputDsl: rest };
}
