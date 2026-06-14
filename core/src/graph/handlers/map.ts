import { resolvePath } from "../../parser/path";
import type { JsonValue, TransformError } from "../../types/index";
import type { GraphNode, MapConfig, TransformGraph } from "../types";
import { applyScopedStructural } from "./pure-structural";

export function executeMapNode(
  input: JsonValue,
  node: GraphNode,
  graph: TransformGraph,
  errors: TransformError[],
): JsonValue {
  const config = node.config as MapConfig;
  const nodeId = node.id;

  const doc = structuredClone(input) as JsonValue;
  const sourceValue = resolvePath(doc, config.source);

  if (sourceValue === undefined || sourceValue === null) {
    return doc;
  }

  if (!Array.isArray(sourceValue)) {
    errors.push({
      type: "TYPE_MISMATCH",
      message: `Map source "${config.source}" is not an array`,
      path: config.source,
      nodeId,
    });
    return doc;
  }

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  for (let i = 0; i < sourceValue.length; i++) {
    const raw = sourceValue[i];
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      errors.push({
        type: "TYPE_MISMATCH",
        message: `Map item at ${config.source}[${i}] is not an object`,
        path: `${config.source}[${i}]`,
        nodeId,
        outputField: `${nodeId}[${i}]`,
      });
      continue;
    }

    let item = structuredClone(raw) as Record<string, JsonValue>;
    const itemPath = `${nodeId}[${i}]`;

    for (const bodyId of config.body) {
      item = executeBodyNode(
        bodyId,
        item,
        doc,
        nodeMap,
        graph,
        errors,
        itemPath,
      );
    }

    sourceValue[i] = item;
  }

  return doc;
}

function executeBodyNode(
  bodyId: string,
  item: Record<string, JsonValue>,
  rootDoc: JsonValue,
  nodeMap: Map<string, GraphNode>,
  graph: TransformGraph,
  errors: TransformError[],
  itemPath: string,
): Record<string, JsonValue> {
  const bodyNode = nodeMap.get(bodyId);
  if (!bodyNode) {
    errors.push({
      type: "GRAPH_INVALID",
      message: `Unknown body node "${bodyId}"`,
      nodeId: bodyId,
    });
    return item;
  }

  switch (bodyNode.type) {
    case "rename":
      return applyScopedStructural(
        item,
        "rename",
        bodyNode.config as import("../types").RenameConfig,
        bodyId,
        errors,
        itemPath,
      );

    case "remove":
      return applyScopedStructural(
        item,
        "remove",
        bodyNode.config as import("../types").RemoveConfig,
        bodyId,
        errors,
        itemPath,
      );

    case "nest":
      return applyScopedStructural(
        item,
        "nest",
        bodyNode.config as import("../types").NestConfig,
        bodyId,
        errors,
        itemPath,
      );

    case "map": {
      const nestedConfig = bodyNode.config as MapConfig;
      const arr = resolvePath(item, nestedConfig.source);

      if (arr === undefined || arr === null) return item;
      if (!Array.isArray(arr)) {
        errors.push({
          type: "TYPE_MISMATCH",
          message: `Map source "${nestedConfig.source}" is not an array`,
          path: nestedConfig.source,
          nodeId: bodyId,
          outputField: itemPath,
        });
        return item;
      }

      for (let j = 0; j < arr.length; j++) {
        const nestedRaw = arr[j];
        if (
          nestedRaw === null ||
          typeof nestedRaw !== "object" ||
          Array.isArray(nestedRaw)
        ) {
          errors.push({
            type: "TYPE_MISMATCH",
            message: `Map item at ${nestedConfig.source}[${j}] is not an object`,
            nodeId: bodyId,
            outputField: `${itemPath}.${nestedConfig.source}[${j}]`,
          });
          continue;
        }

        let nestedItem = structuredClone(nestedRaw) as Record<string, JsonValue>;
        const nestedPath = `${itemPath}.${nestedConfig.source}[${j}]`;

        for (const nestedBodyId of nestedConfig.body) {
          nestedItem = executeBodyNode(
            nestedBodyId,
            nestedItem,
            rootDoc,
            nodeMap,
            graph,
            errors,
            nestedPath,
          );
        }

        arr[j] = nestedItem;
      }

      return item;
    }

    default:
      errors.push({
        type: "GRAPH_INVALID",
        message: `Node type "${bodyNode.type}" is not valid inside a map body`,
        nodeId: bodyId,
      });
      return item;
  }
}
