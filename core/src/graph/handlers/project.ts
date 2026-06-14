import { evaluateTransform } from "../../evaluator/index";
import { resolvePath } from "../../parser/path";
import type { JsonValue, TransformError } from "../../types/index";
import type { PickConfig, ProjectConfig } from "../types";

export function executeProjectNode(
  input: JsonValue,
  config: ProjectConfig,
  nodeId: string,
  errors: TransformError[],
): JsonValue {
  const { output, errors: evalErrors } = evaluateTransform(config.root, input);
  for (const err of evalErrors) {
    errors.push({ ...err, nodeId: err.nodeId ?? nodeId });
  }
  return output;
}

export function executePickNode(
  input: JsonValue,
  config: PickConfig,
  nodeId: string,
  errors: TransformError[],
): JsonValue {
  const result: Record<string, JsonValue> = {};
  for (const [outKey, path] of Object.entries(config.paths)) {
    const value = resolvePath(input, path);
    if (value === undefined) {
      errors.push({
        type: "PATH_NOT_FOUND",
        message: `Path "${path}" not found`,
        path,
        nodeId,
        outputField: outKey,
      });
      result[outKey] = null;
    } else {
      result[outKey] = value as JsonValue;
    }
  }
  return result;
}
