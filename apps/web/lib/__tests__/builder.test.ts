import { describe, expect, it } from "vitest";
import { transform } from "@json-transformer/core";
import {
  applySortSettings,
  dslToBuilder,
  dslToRows,
  newRow,
  parseSortSettings,
  rowsToDsl,
} from "../builder";
import { SAMPLE_DSL, SAMPLE_INPUT } from "../shared";

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

  it("default sample round-trips through the builder and transforms cleanly", () => {
    const input = JSON.parse(SAMPLE_INPUT);
    const dsl = JSON.parse(SAMPLE_DSL);
    const parsed = dslToBuilder(SAMPLE_DSL);
    expect(parsed).not.toBeNull();
    expect(rowsToDsl(parsed!.rows, parsed!.sortSettings)).toEqual(dsl);

    const { output, errors } = transform(input, dsl);
    expect(errors).toEqual([]);
    expect(output).toMatchObject({
      teamLead: "Ada",
      names: ["Ada", "Linus"],
      emails: ["ada@example.com", "linus@example.com"],
      exportedFrom: "team-directory",
      isAdmin: true,
      roster: "Ada & Linus",
      access: "elevated",
    });
  });

  it("parseSortSettings and applySortSettings round-trip root sort", () => {
    const dsl = {
      $sort: "alphabetical",
      z: "user.name",
      a: "user.age",
    };

    expect(parseSortSettings(dsl)).toEqual({ order: "root-alphabetical" });
    expect(applySortSettings({ z: "user.name", a: "user.age" }, { order: "root-alphabetical" })).toEqual(dsl);
  });

  it("parseSortSettings and applySortSettings round-trip array sort", () => {
    const dsl = {
      $sort: { at: "items[]" },
      items: "users[]",
    };

    expect(parseSortSettings(dsl)).toEqual({
      order: "array-alphabetical",
      arrayField: "items",
    });
    expect(
      applySortSettings(
        { items: "users[]" },
        { order: "array-alphabetical", arrayField: "items" },
      ),
    ).toEqual(dsl);
  });

  it("dslToBuilder strips $sort from rows", () => {
    const dsl = JSON.stringify({
      $sort: "alphabetical",
      c: "user.email",
      a: "user.name",
      b: "user.age",
    });

    const parsed = dslToBuilder(dsl);
    expect(parsed).not.toBeNull();
    expect(parsed!.sortSettings).toEqual({ order: "root-alphabetical" });
    expect(parsed!.rows.map((r) => r.outputKey)).toEqual(["c", "a", "b"]);
    expect(parsed!.rows.some((r) => r.outputKey === "$sort")).toBe(false);
  });

  it("rowsToDsl with root sort produces sorted transform output", () => {
    const rows = [
      newRow({ outputKey: "c", operation: "path", source: "user.email" }),
      newRow({ outputKey: "a", operation: "path", source: "user.name" }),
      newRow({ outputKey: "b", operation: "path", source: "user.age" }),
    ];

    const dsl = rowsToDsl(rows, { order: "root-alphabetical" });
    expect(dsl).toEqual({
      $sort: "alphabetical",
      c: "user.email",
      a: "user.name",
      b: "user.age",
    });

    const input = {
      user: { name: "John", age: 30, email: "john@example.com" },
    };
    expect(transform(input, dsl).output).toEqual({
      a: "John",
      b: 30,
      c: "john@example.com",
    });
  });

  it("rowsToDsl with array sort sorts keys inside mapped objects", () => {
    const rows = [
      newRow({
        outputKey: "items",
        operation: "map",
        source: "users",
        select: "",
      }),
    ];

    const dsl = rowsToDsl(rows, {
      order: "array-alphabetical",
      arrayField: "items",
    });

    expect(dsl).toEqual({
      $sort: { at: "items[]" },
      items: "users[]",
    });

    const input = {
      users: [{ zebra: 1, alpha: 2 }],
    };
    expect(transform(input, dsl).output).toEqual({
      items: [{ alpha: 2, zebra: 1 }],
    });
  });

  it("parseSortSettings and applySortSettings round-trip deep sort", () => {
    const dsl = {
      $sort: { deep: true },
      z: "user.name",
      a: "user.age",
    };

    expect(parseSortSettings(dsl)).toEqual({ order: "deep-alphabetical" });
    expect(
      applySortSettings(
        { z: "user.name", a: "user.age" },
        { order: "deep-alphabetical" },
      ),
    ).toEqual(dsl);
  });

  it("rowsToDsl with deep sort produces deeply sorted transform output", () => {
    const rows = [
      newRow({
        outputKey: "users",
        operation: "map",
        source: "users",
        select: "",
      }),
      newRow({ outputKey: "tags", operation: "path", source: "tags" }),
    ];

    const dsl = rowsToDsl(rows, { order: "deep-alphabetical" });
    expect(dsl).toEqual({
      $sort: { deep: true },
      users: "users[]",
      tags: "$tags",
    });

    const input = {
      tags: ["z", "a"],
      users: [{ zebra: 1, alpha: 2 }],
    };
    expect(transform(input, dsl).output).toEqual({
      tags: ["a", "z"],
      users: [{ alpha: 2, zebra: 1 }],
    });
  });
});
