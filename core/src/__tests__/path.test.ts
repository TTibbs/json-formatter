import { describe, expect, it } from "vitest";
import { resolvePath } from "../parser/path";

const input = {
  user: { name: "Ada", profile: { email: "ada@example.com" } },
  items: [{ price: 10 }, { price: 20 }],
};

describe("resolvePath", () => {
  it("resolves dot notation", () => {
    expect(resolvePath(input, "user.name")).toBe("Ada");
    expect(resolvePath(input, "user.profile.email")).toBe("ada@example.com");
  });

  it("resolves array indices", () => {
    expect(resolvePath(input, "items[0].price")).toBe(10);
    expect(resolvePath(input, "items[1].price")).toBe(20);
  });

  it("returns undefined for missing paths", () => {
    expect(resolvePath(input, "user.age")).toBeUndefined();
    expect(resolvePath(input, "missing.deeply.nested")).toBeUndefined();
    expect(resolvePath(input, "items[9].price")).toBeUndefined();
  });

  it("never throws on weird inputs", () => {
    expect(resolvePath(null, "a.b")).toBeUndefined();
    expect(resolvePath(undefined, "a")).toBeUndefined();
    expect(resolvePath(42, "a.b")).toBeUndefined();
    expect(resolvePath(input, "")).toBeUndefined();
    expect(resolvePath(input, "items.notAnIndex")).toBeUndefined();
  });
});
