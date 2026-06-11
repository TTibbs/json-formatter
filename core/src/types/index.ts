/** Any JSON-compatible value. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Raw (un-normalized) DSL as authored by the user. */
export type RawDsl = JsonValue;

/** Top-level transform document. */
export interface Transform {
  version: 1;
  root: Node;
}

/** Normalized node union — the strict internal format. */
export type Node =
  | ObjectNode
  | ArrayNode
  | PathNode
  | ExpressionNode
  | MapNode
  | ConditionNode
  | LiteralNode;

export interface ObjectNode {
  type: "object";
  entries: Record<string, Node>;
}

export interface ArrayNode {
  type: "array";
  items: Node[];
}

export interface PathNode {
  type: "path";
  value: string;
}

export interface ExpressionNode {
  type: "expression";
  /** Original expression source, kept for error reporting. */
  source: string;
  ast: Expr;
}

export interface MapNode {
  type: "map";
  source: string;
  select: Node;
}

export interface ConditionNode {
  type: "condition";
  if: Expr;
  /** Original condition text as authored ("user.active" or "$user.age > 18"). */
  ifSource: string;
  then: Node;
  else: Node;
}

export interface LiteralNode {
  type: "literal";
  value: JsonValue;
}

/** Expression AST (safe subset — no function calls, no arbitrary JS). */
export type Expr = LiteralExpr | PathExpr | BinaryExpr;

export interface LiteralExpr {
  type: "literal";
  value: string | number | boolean | null;
}

export interface PathExpr {
  type: "path";
  value: string;
}

export type BinaryOp =
  | "+"
  | "-"
  | "*"
  | "/"
  | ">"
  | "<"
  | ">="
  | "<="
  | "=="
  | "!="
  | "&&"
  | "||";

export interface BinaryExpr {
  type: "binary";
  op: BinaryOp;
  left: Expr;
  right: Expr;
}

/** Execution context passed through the evaluator. */
export interface Context {
  /** The root input JSON. */
  root: unknown;
  /** The current scope (root, or the current array item inside a map). */
  current: unknown;
}

export type TransformErrorType =
  | "PATH_NOT_FOUND"
  | "INVALID_EXPRESSION"
  | "TYPE_MISMATCH"
  | "DSL_INVALID";

export interface TransformError {
  type: TransformErrorType;
  message: string;
  /** The source path or expression involved, when known. */
  path?: string;
  /** The output field this error belongs to ("user.fullName", "emails[2]"). */
  outputField?: string;
}

/** Result of running a transform — never throws, errors are collected. */
export interface TransformResult {
  output: JsonValue;
  errors: TransformError[];
}
