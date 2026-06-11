import { describe, expect, it } from "vitest";
import { transform } from "../index";
import { normalize } from "../dsl/normalize";
import { serializeNode } from "../dsl/serialize";

describe("ConditionNode", () => {
  it("evaluates then/else branches", () => {
    const dsl = {
      status: { if: "$user.active", then: "active", else: "inactive" },
    };

    expect(transform({ user: { active: true } }, dsl).output).toEqual({
      status: "active",
    });
    expect(transform({ user: { active: false } }, dsl).output).toEqual({
      status: "inactive",
    });
  });

  it("supports comparison conditions and nested branch nodes", () => {
    const dsl = {
      tier: {
        if: "$user.age >= 18",
        then: { label: "adult", name: "user.name" },
        else: "minor",
      },
    };

    expect(
      transform({ user: { age: 30, name: "Ada" } }, dsl).output,
    ).toEqual({ tier: { label: "adult", name: "Ada" } });
    expect(transform({ user: { age: 10 } }, dsl).output).toEqual({
      tier: "minor",
    });
  });

  it("accepts a bare path as the condition", () => {
    const dsl = { status: { if: "user.active", then: "on", else: "off" } };
    expect(transform({ user: { active: true } }, dsl).output).toEqual({
      status: "on",
    });
  });

  it("missing else defaults to null", () => {
    const dsl = { x: { if: "$flag", then: "yes" } };
    expect(transform({ flag: false }, dsl).output).toEqual({ x: null });
  });

  it("round-trips through serializeNode", () => {
    const dsl = {
      status: { if: "$user.active", then: "active", else: "inactive" },
    };
    const { node, errors } = normalize(dsl);
    expect(errors).toEqual([]);
    expect(serializeNode(node)).toEqual(dsl);
  });

  it("treats objects with extra keys as plain objects, not conditions", () => {
    const dsl = { x: { if: "$a", then: "b", other: "c.d" } };
    expect(transform({ c: { d: 1 } }, dsl).output).toEqual({
      x: { if: null, then: "b", other: 1 },
    });
  });

  it("reports invalid condition expressions with output attribution", () => {
    const res = transform({}, { x: { if: "$a >", then: 1 } });
    expect(res.output).toEqual({ x: null });
    expect(res.errors).toContainEqual(
      expect.objectContaining({ type: "INVALID_EXPRESSION", outputField: "x" }),
    );
  });
});

describe("error outputField attribution", () => {
  it("attributes missing paths to their output field", () => {
    const res = transform({}, { user: { name: "person.name" } });
    expect(res.errors).toContainEqual(
      expect.objectContaining({
        type: "PATH_NOT_FOUND",
        outputField: "user.name",
      }),
    );
  });

  it("attributes map item failures with indices", () => {
    const res = transform(
      { users: [{ email: "a@b.c" }, {}] },
      { emails: "users[].email" },
    );
    expect(res.errors).toContainEqual(
      expect.objectContaining({
        type: "PATH_NOT_FOUND",
        outputField: "emails[1]",
      }),
    );
  });

  it("attributes non-array map sources", () => {
    const res = transform({ users: 42 }, { emails: "users[].email" });
    expect(res.errors).toContainEqual(
      expect.objectContaining({
        type: "TYPE_MISMATCH",
        outputField: "emails",
      }),
    );
  });

  it("attributes parse-time expression errors", () => {
    const res = transform({}, { broken: "$x >" });
    expect(res.errors).toContainEqual(
      expect.objectContaining({
        type: "INVALID_EXPRESSION",
        outputField: "broken",
      }),
    );
  });
});
