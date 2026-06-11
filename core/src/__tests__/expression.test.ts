import { describe, expect, it } from "vitest";
import { parseExpression } from "../parser/expression";
import { evaluateExpression } from "../evaluator/expression";

const input = {
  user: { first: "John", last: "Doe", age: 25, active: true },
  items: [{ price: 10 }],
};

function run(src: string) {
  return evaluateExpression(parseExpression(src), { root: input, current: input });
}

describe("expression parser + evaluator", () => {
  it("evaluates arithmetic", () => {
    expect(run("1 + 2 * 3")).toBe(7);
    expect(run("(1 + 2) * 3")).toBe(9);
    expect(run("10 / 4")).toBe(2.5);
  });

  it("evaluates string concat", () => {
    expect(run("$user.first + ' ' + $user.last")).toBe("John Doe");
  });

  it("evaluates comparisons", () => {
    expect(run("$user.age > 18")).toBe(true);
    expect(run("$user.age < 18")).toBe(false);
    expect(run("$user.age >= 25")).toBe(true);
    expect(run("$user.age == 25")).toBe(true);
    expect(run("$user.age != 25")).toBe(false);
  });

  it("evaluates logical ops with precedence", () => {
    expect(run("$user.active && $user.age > 18")).toBe(true);
    expect(run("$user.age > 30 || $user.active")).toBe(true);
    expect(run("$user.age > 30 && $user.active")).toBe(false);
  });

  it("supports literals: booleans, null, double-quoted strings", () => {
    expect(run("true && false")).toBe(false);
    expect(run("null == null")).toBe(true);
    expect(run('"a" + "b"')).toBe("ab");
  });

  it("resolves path indices inside expressions", () => {
    expect(run("$items[0].price * 2")).toBe(20);
  });

  it("throws on invalid syntax", () => {
    expect(() => parseExpression("$user.age >")).toThrow();
    expect(() => parseExpression("foo bar")).toThrow();
    expect(() => parseExpression("'unterminated")).toThrow();
    expect(() => parseExpression("")).toThrow();
  });
});
