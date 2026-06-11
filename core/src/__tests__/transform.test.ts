import { describe, expect, it } from "vitest";
import { transform } from "../index";

describe("transform (public API)", () => {
  it("passes the MVP acceptance case", () => {
    const input = { user: { first: "John", last: "Doe", age: 25 } };
    const dsl = {
      fullName: "$user.first + ' ' + $user.last",
      isAdult: "$user.age > 18",
    };

    expect(transform(input, dsl).output).toEqual({
      fullName: "John Doe",
      isAdult: true,
    });
  });

  it("maps paths, literals, and nested objects", () => {
    const input = { user: { id: 1, contact: { email: "a@b.c" } } };
    const dsl = {
      id: "user.id",
      meta: { source: "api", version: 2, enabled: true },
      email: "user.contact.email",
    };

    expect(transform(input, dsl).output).toEqual({
      id: 1,
      meta: { source: "api", version: 2, enabled: true },
      email: "a@b.c",
    });
  });

  it("handles array map shorthand users[].email", () => {
    const input = {
      users: [{ email: "a@x.com" }, { email: "b@x.com" }],
    };

    expect(transform(input, { emails: "users[].email" }).output).toEqual({
      emails: ["a@x.com", "b@x.com"],
    });
  });

  it("supports nested map shorthand and identity select", () => {
    const input = {
      orders: [
        { lines: [{ sku: "A" }, { sku: "B" }] },
        { lines: [{ sku: "C" }] },
      ],
      tags: ["x", "y"],
    };

    expect(
      transform(input, { skus: "orders[].lines[].sku", tags: "tags[]" }).output,
    ).toEqual({
      skus: [["A", "B"], ["C"]],
      tags: ["x", "y"],
    });
  });

  it("returns null for missing paths and records an error", () => {
    const res = transform({}, { name: "user.name" });
    expect(res.output).toEqual({ name: null });
    expect(res.errors).toContainEqual(
      expect.objectContaining({ type: "PATH_NOT_FOUND" }),
    );
  });

  it("returns null for invalid expressions and records an error", () => {
    const res = transform({}, { broken: "$user.age >" });
    expect(res.output).toEqual({ broken: null });
    expect(res.errors).toContainEqual(
      expect.objectContaining({ type: "INVALID_EXPRESSION" }),
    );
  });

  it("returns [] when map source is not an array", () => {
    const input = { users: "not-an-array" };
    expect(transform(input, { emails: "users[].email" }).output).toEqual({
      emails: [],
    });
  });

  it("treats plain strings as literals", () => {
    expect(transform({}, { source: "api" }).output).toEqual({ source: "api" });
  });

  it("evaluates DSL arrays element-wise", () => {
    const input = { a: 1, b: 2 };
    expect(transform(input, { pair: ["a", "b", "$a + $b"] }).output).toEqual({
      pair: ["a", "b", 3],
    });
  });

  it("is deterministic", () => {
    const input = { user: { age: 30 } };
    const dsl = { adult: "$user.age >= 18" };
    expect(transform(input, dsl)).toEqual(transform(input, dsl));
  });

  it("never mutates the input", () => {
    const input = { user: { first: "A", last: "B" } };
    const snapshot = JSON.parse(JSON.stringify(input));
    transform(input, { name: "$user.first + $user.last" });
    expect(input).toEqual(snapshot);
  });
});
