import type { BinaryOp, Expr } from "../types/index";
import { tokenize, type Token } from "./tokenizer";

const PRECEDENCE: Record<string, number> = {
  "||": 1,
  "&&": 2,
  "==": 3,
  "!=": 3,
  ">": 4,
  "<": 4,
  ">=": 4,
  "<=": 4,
  "+": 5,
  "-": 5,
  "*": 6,
  "/": 6,
};

/**
 * Parse a safe-subset expression (`$user.age > 18`) into an Expr AST.
 * Throws on invalid syntax — callers are expected to catch.
 */
export function parseExpression(input: string): Expr {
  const tokens = tokenize(input);
  if (tokens.length === 0) throw new Error("Empty expression");

  let index = 0;

  function peek(): Token | undefined {
    return tokens[index];
  }

  function consume(): Token | undefined {
    return tokens[index++];
  }

  function parsePrimary(): Expr {
    const token = consume();
    if (!token) throw new Error("Unexpected end of expression");

    switch (token.type) {
      case "number": {
        const num = Number(token.value);
        if (Number.isNaN(num)) throw new Error(`Invalid number: ${token.value}`);
        return { type: "literal", value: num };
      }
      case "string":
        return { type: "literal", value: token.value };
      case "boolean":
        return { type: "literal", value: token.value };
      case "null":
        return { type: "literal", value: null };
      case "path":
        return { type: "path", value: token.value };
      case "paren": {
        if (token.value === "(") {
          const expr = parseBinary(0);
          const close = consume();
          if (!close || close.type !== "paren" || close.value !== ")") {
            throw new Error("Expected closing parenthesis");
          }
          return expr;
        }
        throw new Error("Unexpected ')'");
      }
      default:
        throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
    }
  }

  function parseBinary(minBP: number): Expr {
    let left = parsePrimary();

    while (true) {
      const op = peek();
      if (!op || op.type !== "op") break;

      const bp = PRECEDENCE[op.value];
      if (bp === undefined || bp < minBP) break;

      consume();
      const right = parseBinary(bp + 1);

      left = { type: "binary", op: op.value as BinaryOp, left, right };
    }

    return left;
  }

  const expr = parseBinary(0);

  if (index < tokens.length) {
    throw new Error(`Unexpected trailing token: ${JSON.stringify(tokens[index])}`);
  }

  return expr;
}
