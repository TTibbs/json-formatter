import { describe, expect, it } from "vitest";
import { normalize } from "../dsl/normalize";
import { serializeNode } from "../dsl/serialize";
import type { Node } from "../types/index";

/** DSL -> AST -> DSL must reproduce the original DSL. */
function expectDslRoundTrip(dsl: unknown) {
  const { node, errors } = normalize(dsl as never);
  expect(errors).toEqual([]);
  expect(serializeNode(node)).toEqual(dsl);
}

/** AST -> DSL -> AST must reproduce the original node. */
function expectNodeRoundTrip(node: Node) {
  const dsl = serializeNode(node);
  const { node: reparsed, errors } = normalize(dsl);
  expect(errors).toEqual([]);
  expect(reparsed).toEqual(node);
}

describe("serializeNode", () => {
  it("round-trips the acceptance-case DSL", () => {
    expectDslRoundTrip({
      fullName: "$user.first + ' ' + $user.last",
      isAdult: "$user.age > 18",
      email: "user.contact.email",
      firstItem: "items[0].name",
      emails: "users[].email",
      source: "api",
    });
  });

  it("round-trips paths, including bracket indices", () => {
    expectDslRoundTrip({ a: "user.name", b: "items[0].price" });
  });

  it("encodes bare-name paths as $refs", () => {
    const node: Node = {
      type: "object",
      entries: { v: { type: "path", value: "version" } },
    };
    expect(serializeNode(node)).toEqual({ v: "$version" });
  });

  it("round-trips maps, identity maps, and nested maps", () => {
    expectDslRoundTrip({
      emails: "users[].email",
      whole: "items[]",
      nested: "orders[].lines[].sku",
      deep: "users[].contact.email",
    });
  });

  it("round-trips literals, nested objects, and DSL arrays", () => {
    expectDslRoundTrip({
      source: "api",
      version: 2,
      enabled: true,
      nothing: null,
      meta: { kind: "report", tags: ["a", "b"] },
    });
  });

  it("round-trips a hand-built map node back to shorthand", () => {
    expectNodeRoundTrip({
      type: "object",
      entries: {
        emails: {
          type: "map",
          source: "users",
          select: { type: "path", value: "email" },
        },
        whole: {
          type: "map",
          source: "items",
          select: { type: "path", value: "" },
        },
      },
    });
  });

  it("preserves expression source text exactly", () => {
    const dsl = { x: "$a + $b * ($c - 1)" };
    const { node } = normalize(dsl);
    expect(serializeNode(node)).toEqual(dsl);
  });

  it("throws for nodes the shorthand grammar cannot express", () => {
    expect(() =>
      serializeNode({ type: "path", value: "" }),
    ).toThrow();
    expect(() =>
      serializeNode({
        type: "map",
        source: "users",
        select: { type: "literal", value: 1 },
      }),
    ).toThrow();
  });
});
