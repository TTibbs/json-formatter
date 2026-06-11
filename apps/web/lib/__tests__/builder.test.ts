import { describe, expect, it } from "vitest";
import { transform } from "@json-transformer/core";
import { dslToRows, newRow, rowsToDsl } from "../builder";

describe("builder rows <-> DSL (via core AST)", () => {
  it("serializes all four operations", () => {
    const rows = [
      newRow({
        outputKey: "fullName",
        operation: "expression",
        source: "$user.first + ' ' + $user.last",
      }),
      newRow({ outputKey: "email", operation: "path", source: "user.contact.email" }),
      newRow({ outputKey: "emails", operation: "map", source: "users", select: "email" }),
      newRow({ outputKey: "whole", operation: "map", source: "items", select: "" }),
      newRow({ outputKey: "src", operation: "literal", value: "api" }),
      newRow({ outputKey: "version", operation: "literal", value: "2" }),
      newRow({ outputKey: "bare", operation: "path", source: "topLevel" }),
    ];

    expect(rowsToDsl(rows)).toEqual({
      fullName: "$user.first + ' ' + $user.last",
      email: "user.contact.email",
      emails: "users[].email",
      whole: "items[]",
      src: "api",
      version: 2,
      bare: "$topLevel",
    });
  });

  it("round-trips rows -> DSL -> rows -> identical DSL", () => {
    const rows = [
      newRow({ outputKey: "a", operation: "path", source: "user.name" }),
      newRow({ outputKey: "b", operation: "expression", source: "$x > 1 && $y < 2" }),
      newRow({ outputKey: "c", operation: "map", source: "users", select: "email" }),
      newRow({ outputKey: "d", operation: "literal", value: "true" }),
    ];

    const dsl = rowsToDsl(rows);
    const reimported = dslToRows(JSON.stringify(dsl));
    expect(reimported).not.toBeNull();
    expect(rowsToDsl(reimported!)).toEqual(dsl);
  });

  it("imports pure-path expressions as Map field rows", () => {
    const rows = dslToRows('{"v": "$version", "e": "$user.age"}');
    expect(rows).not.toBeNull();
    expect(rows![0]).toMatchObject({ operation: "path", source: "version" });
    expect(rows![1]).toMatchObject({ operation: "path", source: "user.age" });
  });

  it("rejects shapes the flat builder cannot represent", () => {
    expect(dslToRows('{"nested": {"a": "b.c"}}')).toBeNull();
    expect(dslToRows('{"x": "a[].b[].c"}')).toBeNull();
    expect(dslToRows('{"arr": ["a.b"]}')).toBeNull();
    expect(dslToRows("not json")).toBeNull();
    expect(dslToRows('{"broken": "$user.age >"}')).toBeNull();
  });

  it("incomplete rows degrade to null output instead of throwing", () => {
    const rows = [
      newRow({ outputKey: "p", operation: "path", source: "" }),
      newRow({ outputKey: "m", operation: "map", source: "", select: "x" }),
    ];
    expect(rowsToDsl(rows)).toEqual({ p: null, m: null });
  });

  it("compiles Concat rows to + expressions", () => {
    const rows = [
      newRow({
        outputKey: "fullName",
        operation: "concat",
        parts: ["user.first", "user.last"],
        separator: " ",
      }),
      newRow({
        outputKey: "id",
        operation: "concat",
        parts: ["org", "user.id"],
        separator: "",
      }),
    ];

    const dsl = rowsToDsl(rows);
    expect(dsl).toEqual({
      fullName: "$user.first + ' ' + $user.last",
      id: "$org + $user.id",
    });

    const input = { org: "acme-", user: { first: "Ada", last: "L", id: 7 } };
    expect(transform(input, dsl).output).toEqual({
      fullName: "Ada L",
      id: "acme-7",
    });
  });

  it("reimports concat chains as Concat rows", () => {
    const rows = dslToRows(
      '{"fullName": "$a.b + \' \' + $c + \' \' + $d", "joined": "$x + $y"}',
    );
    expect(rows).not.toBeNull();
    expect(rows![0]).toMatchObject({
      operation: "concat",
      parts: ["a.b", "c", "d"],
      separator: " ",
    });
    expect(rows![1]).toMatchObject({
      operation: "concat",
      parts: ["x", "y"],
      separator: "",
    });
  });

  it("falls back to Compute for non-concat expressions", () => {
    const rows = dslToRows(
      '{"mixed": "$a + \'x\' + $b + \'y\' + $c", "math": "$a + 1"}',
    );
    expect(rows).not.toBeNull();
    expect(rows![0].operation).toBe("expression");
    expect(rows![1].operation).toBe("expression");
  });

  it("compiles If/Else rows to condition DSL and evaluates", () => {
    const rows = [
      newRow({
        outputKey: "tier",
        operation: "condition",
        condField: "user.age",
        condOp: ">=",
        condValue: "18",
        thenValue: "adult",
        elseValue: "minor",
      }),
      newRow({
        outputKey: "name",
        operation: "condition",
        condField: "user.active",
        condOp: "truthy",
        thenValue: "user.name",
        elseValue: "anonymous",
      }),
    ];

    const dsl = rowsToDsl(rows);
    expect(dsl).toEqual({
      tier: { if: "$user.age >= 18", then: "adult", else: "minor" },
      name: { if: "$user.active", then: "user.name", else: "anonymous" },
    });

    const adult = { user: { age: 30, active: true, name: "Ada" } };
    expect(transform(adult, dsl).output).toEqual({
      tier: "adult",
      name: "Ada",
    });

    const minor = { user: { age: 10, active: false, name: "Kid" } };
    expect(transform(minor, dsl).output).toEqual({
      tier: "minor",
      name: "anonymous",
    });
  });

  it("reimports condition DSL as If/Else rows", () => {
    const rows = dslToRows(
      JSON.stringify({
        tier: { if: "$user.age >= 18", then: "adult", else: "minor" },
        flag: { if: "$user.active", then: true, else: false },
        off: { if: "$user.active == false", then: "off", else: "on" },
      }),
    );
    expect(rows).not.toBeNull();
    expect(rows![0]).toMatchObject({
      operation: "condition",
      condField: "user.age",
      condOp: ">=",
      condValue: "18",
      thenValue: "adult",
      elseValue: "minor",
    });
    expect(rows![1]).toMatchObject({
      operation: "condition",
      condOp: "truthy",
      thenValue: "true",
      elseValue: "false",
    });
    expect(rows![2]).toMatchObject({ operation: "condition", condOp: "falsy" });
  });

  it("rejects conditions with complex branches", () => {
    const dsl = JSON.stringify({
      x: { if: "$a", then: { nested: "b.c" }, else: "d" },
    });
    expect(dslToRows(dsl)).toBeNull();
  });

  it("round-trips concat and condition rows to identical DSL", () => {
    const rows = [
      newRow({
        outputKey: "fullName",
        operation: "concat",
        parts: ["user.first", "user.last"],
        separator: " ",
      }),
      newRow({
        outputKey: "tier",
        operation: "condition",
        condField: "user.age",
        condOp: ">",
        condValue: "18",
        thenValue: "adult",
        elseValue: "minor",
      }),
    ];

    const dsl = rowsToDsl(rows);
    const reimported = dslToRows(JSON.stringify(dsl));
    expect(reimported).not.toBeNull();
    expect(rowsToDsl(reimported!)).toEqual(dsl);
  });

  it("builder rows drive the engine to the acceptance output", () => {
    const rows = [
      newRow({
        outputKey: "fullName",
        operation: "expression",
        source: "$user.first + ' ' + $user.last",
      }),
      newRow({ outputKey: "isAdult", operation: "expression", source: "$user.age > 18" }),
    ];

    const input = { user: { first: "John", last: "Doe", age: 25 } };
    expect(transform(input, rowsToDsl(rows)).output).toEqual({
      fullName: "John Doe",
      isAdult: true,
    });
  });
});
