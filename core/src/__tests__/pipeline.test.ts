import { describe, expect, it } from "vitest";
import { transform } from "../index";

describe("pipeline transforms", () => {
  it("moves a field into a nested path per array item", () => {
    const input = {
      users: [{ id: 1, notifications: ["a"], name: "Ada" }],
    };

    const dsl = {
      $pipeline: [
        {
          foreach: "users",
          steps: [
            {
              move: {
                from: "notifications",
                to: "settings.notifications",
              },
            },
          ],
        },
      ],
      users: "users[]",
    };

    expect(transform(input, dsl).output).toEqual({
      users: [{ id: 1, name: "Ada", settings: { notifications: ["a"] } }],
    });
  });

  it("returns reshaped document when $pipeline is the only key", () => {
    const input = {
      users: [{ id: 1, notifications: ["a"], name: "Ada" }],
    };

    const dsl = {
      $pipeline: [
        {
          foreach: "users",
          steps: [
            {
              move: {
                from: "notifications",
                to: "settings.notifications",
              },
            },
          ],
        },
      ],
    };

    expect(transform(input, dsl).output).toEqual({
      users: [{ id: 1, name: "Ada", settings: { notifications: ["a"] } }],
    });
  });

  it("supports nested foreach (orders → lines)", () => {
    const input = {
      orders: [
        { lines: [{ sku: "A" }, { sku: "B" }] },
        { lines: [{ sku: "C" }] },
      ],
    };

    const dsl = {
      $pipeline: [
        {
          foreach: "orders",
          steps: [
            {
              foreach: "lines",
              steps: [{ rename: { from: "sku", to: "productSku" } }],
            },
          ],
        },
      ],
    };

    expect(transform(input, dsl).output).toEqual({
      orders: [
        { lines: [{ productSku: "A" }, { productSku: "B" }] },
        { lines: [{ productSku: "C" }] },
      ],
    });
  });

  it("removes a field across items", () => {
    const input = {
      users: [
        { id: 1, legacy: true, name: "Ada" },
        { id: 2, legacy: false, name: "Bob" },
      ],
    };

    const dsl = {
      $pipeline: [
        {
          foreach: "users",
          steps: [{ remove: "legacy" }],
        },
      ],
    };

    expect(transform(input, dsl).output).toEqual({
      users: [
        { id: 1, name: "Ada" },
        { id: 2, name: "Bob" },
      ],
    });
  });

  it("reports TYPE_MISMATCH when foreach source is not an array", () => {
    const input = { users: "not-an-array" };
    const dsl = {
      $pipeline: [
        {
          foreach: "users",
          steps: [{ remove: "legacy" }],
        },
      ],
    };

    const res = transform(input, dsl);
    expect(res.output).toEqual({ users: "not-an-array" });
    expect(res.errors).toContainEqual(
      expect.objectContaining({ type: "TYPE_MISMATCH" }),
    );
  });

  it("reports PATH_NOT_FOUND when move from is missing", () => {
    const input = { users: [{ id: 1, name: "Ada" }] };
    const dsl = {
      $pipeline: [
        {
          foreach: "users",
          steps: [
            {
              move: {
                from: "notifications",
                to: "settings.notifications",
              },
            },
          ],
        },
      ],
    };

    const res = transform(input, dsl);
    expect(res.output).toEqual({ users: [{ id: 1, name: "Ada" }] });
    expect(res.errors).toContainEqual(
      expect.objectContaining({ type: "PATH_NOT_FOUND" }),
    );
  });

  it("reports STRUCTURAL_CONFLICT when move target already exists", () => {
    const input = {
      users: [
        {
          notifications: ["a"],
          settings: { notifications: ["b"] },
        },
      ],
    };

    const dsl = {
      $pipeline: [
        {
          foreach: "users",
          steps: [
            {
              move: {
                from: "notifications",
                to: "settings.notifications",
              },
            },
          ],
        },
      ],
    };

    const res = transform(input, dsl);
    expect(res.output).toEqual({
      users: [
        {
          notifications: ["a"],
          settings: { notifications: ["b"] },
        },
      ],
    });
    expect(res.errors).toContainEqual(
      expect.objectContaining({ type: "STRUCTURAL_CONFLICT" }),
    );
  });

  it("never mutates the original input", () => {
    const input = {
      users: [{ id: 1, notifications: ["a"], name: "Ada" }],
    };
    const snapshot = JSON.parse(JSON.stringify(input));

    transform(input, {
      $pipeline: [
        {
          foreach: "users",
          steps: [
            {
              move: {
                from: "notifications",
                to: "settings.notifications",
              },
            },
          ],
        },
      ],
    });

    expect(input).toEqual(snapshot);
  });

  it("is deterministic", () => {
    const input = { users: [{ id: 1, legacy: true }] };
    const dsl = {
      $pipeline: [
        {
          foreach: "users",
          steps: [{ remove: "legacy" }],
        },
      ],
    };

    expect(transform(input, dsl)).toEqual(transform(input, dsl));
  });

  it("combines pipeline with output shaping", () => {
    const input = {
      users: [{ id: 1, notifications: ["a"], name: "Ada" }],
      meta: { version: 1 },
    };

    const dsl = {
      $pipeline: [
        {
          foreach: "users",
          steps: [
            {
              move: {
                from: "notifications",
                to: "settings.notifications",
              },
            },
          ],
        },
      ],
      userNames: "users[].name",
      version: "meta.version",
    };

    expect(transform(input, dsl).output).toEqual({
      userNames: ["Ada"],
      version: 1,
    });
  });
});

describe("transform (MVP 1 regression)", () => {
  it("passes the MVP acceptance case without $pipeline", () => {
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

  it("handles array map shorthand users[].email", () => {
    const input = {
      users: [{ email: "a@x.com" }, { email: "b@x.com" }],
    };

    expect(transform(input, { emails: "users[].email" }).output).toEqual({
      emails: ["a@x.com", "b@x.com"],
    });
  });
});
