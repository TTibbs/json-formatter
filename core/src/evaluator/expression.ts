import { resolvePath } from "../parser/path";
import type { Context, Expr } from "../types/index";

/**
 * Evaluate an Expr AST against an execution context.
 * Deterministic, never mutates the input. Throws only on malformed AST
 * (callers catch and degrade to null).
 */
export function evaluateExpression(expr: Expr, context: Context): unknown {
  switch (expr.type) {
    case "literal":
      return expr.value;

    case "path":
      return resolvePath(context.current, expr.value);

    case "binary": {
      // Short-circuit logical operators before evaluating the right side.
      if (expr.op === "&&") {
        const left = evaluateExpression(expr.left, context);
        return left ? evaluateExpression(expr.right, context) : left;
      }
      if (expr.op === "||") {
        const left = evaluateExpression(expr.left, context);
        return left ? left : evaluateExpression(expr.right, context);
      }

      // Intentionally loose: operators follow JS coercion semantics
      // (e.g. `+` does both numeric addition and string concat).
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const left = evaluateExpression(expr.left, context) as any;
      const right = evaluateExpression(expr.right, context) as any;
      /* eslint-enable @typescript-eslint/no-explicit-any */

      switch (expr.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "==":
          // eslint-disable-next-line eqeqeq
          return left == right;
        case "!=":
          // eslint-disable-next-line eqeqeq
          return left != right;
        case ">":
          return left > right;
        case "<":
          return left < right;
        case ">=":
          return left >= right;
        case "<=":
          return left <= right;
        default:
          throw new Error(`Unknown operator: ${(expr as { op: string }).op}`);
      }
    }
  }
}
