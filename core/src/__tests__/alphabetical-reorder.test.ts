import { describe, expect, it } from "vitest";
import { transform } from "../index";

describe("Alphabetical Reorder", () => {
  it("reorders the root output fields alphabetically via $sort", () => {
    const dsl = {
      $sort: "alphabetical",
      c: "user.email",
      a: "user.name",
      b: "user.age",
    };
    const input = {
      user: { name: "John", age: 30, email: "john@example.com" },
    };
    const result = transform(input, dsl);
    expect(result.output).toEqual({
      a: "John",
      b: 30,
      c: "john@example.com",
    });
    expect(result.errors).toEqual([]);
  });

  it("sorts keys inside a nested output section via $sort", () => {
    const dsl = {
      profile: {
        $sort: "alphabetical",
        z: "user.email",
        a: "user.name",
        m: "user.age",
      },
    };
    const input = {
      user: { name: "Ada", age: 30, email: "ada@example.com" },
    };

    expect(transform(input, dsl).output).toEqual({
      profile: {
        a: "Ada",
        m: 30,
        z: "ada@example.com",
      },
    });
  });

  it("sorts keys inside each array element via $sort at path", () => {
    const dsl = {
      $sort: { at: "items[]" },
      items: "users[]",
    };
    const input = {
      users: [
        { zebra: 1, alpha: 2, middle: 3 },
        { z: "z", a: "a" },
      ],
    };

    expect(transform(input, dsl).output).toEqual({
      items: [
        { alpha: 2, middle: 3, zebra: 1 },
        { a: "a", z: "z" },
      ],
    });
  });

  it("sorts root input keys via $pipeline sort", () => {
    const input = {
      zebra: 1,
      alpha: 2,
      middle: 3,
    };

    const dsl = {
      $pipeline: [{ sort: "alphabetical" }],
    };

    expect(transform(input, dsl).output).toEqual({
      alpha: 2,
      middle: 3,
      zebra: 1,
    });
  });

  it("sorts keys within each foreach item", () => {
    const input = {
      users: [
        { zebra: 1, alpha: 2, name: "Ada" },
        { z: true, a: false, name: "Bob" },
      ],
    };

    const dsl = {
      $pipeline: [
        {
          foreach: "users",
          steps: [{ sort: "alphabetical" }],
        },
      ],
    };

    expect(transform(input, dsl).output).toEqual({
      users: [
        { alpha: 2, name: "Ada", zebra: 1 },
        { a: false, name: "Bob", z: true },
      ],
    });
  });

  it("sorts keys at a nested path via pipeline sort", () => {
    const input = {
      user: {
        address: { zip: "90210", city: "LA", street: "Main" },
        name: "Ada",
      },
    };

    const dsl = {
      $pipeline: [{ sort: { path: "user.address" } }],
    };

    expect(transform(input, dsl).output).toEqual({
      user: {
        address: { city: "LA", street: "Main", zip: "90210" },
        name: "Ada",
      },
    });
  });

  it("preserves DSL key order when $sort is not set", () => {
    const dsl = {
      c: "user.email",
      a: "user.name",
      b: "user.age",
    };
    const input = {
      user: { name: "John", age: 30, email: "john@example.com" },
    };

    expect(transform(input, dsl).output).toEqual({
      c: "john@example.com",
      a: "John",
      b: 30,
    });
  });

  it("never mutates the original input", () => {
    const input = {
      users: [{ zebra: 1, alpha: 2 }],
    };
    const snapshot = JSON.parse(JSON.stringify(input));

    transform(input, {
      $pipeline: [
        {
          foreach: "users",
          steps: [{ sort: "alphabetical" }],
        },
      ],
    });

    expect(input).toEqual(snapshot);
  });
});

describe("Deep alphabetical reorder", () => {
  it("sorts root and nested object keys via $sort deep", () => {
    const dsl = {
      $sort: { deep: true },
      z: "user.name",
      meta: {
        b: "user.age",
        a: "user.email",
      },
    };
    const input = {
      user: { name: "Ada", age: 30, email: "ada@example.com" },
    };

    expect(transform(input, dsl).output).toEqual({
      meta: {
        a: "ada@example.com",
        b: 30,
      },
      z: "Ada",
    });
  });

  it("sorts primitive array values at every level", () => {
    const dsl = {
      $sort: { deep: true },
      tags: "$tags",
      name: "$name",
    };
    const input = {
      tags: ["z", "a", "m"],
      name: "Ada",
    };

    expect(transform(input, dsl).output).toEqual({
      name: "Ada",
      tags: ["a", "m", "z"],
    });
  });

  it("preserves array-of-object order but sorts keys inside each item", () => {
    const dsl = {
      $sort: { deep: true },
      users: "users[]",
    };
    const input = {
      users: [
        { zebra: 1, alpha: 2 },
        { z: true, a: false },
      ],
    };

    expect(transform(input, dsl).output).toEqual({
      users: [
        { alpha: 2, zebra: 1 },
        { a: false, z: true },
      ],
    });
  });

  it("deep-sorts input via $pipeline sort", () => {
    const input = {
      zebra: 1,
      nested: { z: 3, a: 1 },
      tags: ["z", "a"],
    };

    const dsl = {
      $pipeline: [{ sort: { deep: true } }],
    };

    expect(transform(input, dsl).output).toEqual({
      nested: { a: 1, z: 3 },
      tags: ["a", "z"],
      zebra: 1,
    });
  });

  it("leaves mixed-type arrays in place while recursing nested values", () => {
    const dsl = {
      $sort: { deep: true },
      mixed: "$mixed",
    };
    const input = {
      mixed: ["z", 1, { b: 2, a: 1 }],
    };

    expect(transform(input, dsl).output).toEqual({
      mixed: ["z", 1, { a: 1, b: 2 }],
    });
  });
});
