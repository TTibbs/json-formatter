import type { Expr, JsonValue, Node, SortOrder } from "../types/index";

export type { SortOrder };

export interface TransformGraph {
  id: string;
  version: 2;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphEdge {
  from: string;
  to: string;
  fromPort?: string;
  toPort?: string;
}

export type GraphNodeType =
  | "input"
  | "output"
  | "pick"
  | "rename"
  | "remove"
  | "nest"
  | "flatten"
  | "map"
  | "project"
  | "condition"
  | "sort";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  config?: GraphNodeConfig;
}

export type GraphNodeConfig =
  | PickConfig
  | RenameConfig
  | RemoveConfig
  | NestConfig
  | FlattenConfig
  | MapConfig
  | ProjectConfig
  | ConditionConfig
  | SortConfig
  | Record<string, never>;

export interface SortConfig {
  order: SortOrder;
  /** Sort keys of object at this path in the current document scope. */
  path?: string;
  /** Post-projection: walk output JSON and sort objects at this path. */
  at?: string;
  /** Recursively sort object keys and primitive array elements. */
  deep?: boolean;
}

export interface PickConfig {
  paths: Record<string, string>;
}

export interface RenameConfig {
  map: Record<string, string>;
}

export interface RemoveConfig {
  paths: string[];
}

export interface NestConfig {
  from: string;
  to: string;
}

export interface FlattenConfig {
  mappings: Record<string, string>;
}

export interface MapConfig {
  source: string;
  as?: string;
  body: string[];
}

export interface ProjectConfig {
  root: Node;
}

export interface ConditionConfig {
  ifSource: string;
  if: Expr;
  thenNode: string;
  elseNode: string;
}

export interface GraphValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CompileResult {
  graph: TransformGraph;
  errors: import("../types/index").TransformError[];
}

/** Runtime value flowing between graph nodes. */
export type GraphValue = JsonValue;
