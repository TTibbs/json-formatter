import { describe, expect, it } from "vitest";
import {
  deleteAtPath,
  getAtPath,
  moveAtPath,
  setAtPath,
} from "../parser/path-mutate";
import { JsonValue } from "../types";

describe("getAtPath", () => {
  const obj = {
    user: { name: "Ada", profile: { email: "ada@example.com" } },
    items: [{ price: 10 }, { price: 20 }],
  };

  it("reads nested values", () => {
    expect(getAtPath(obj, "user.name")).toBe("Ada");
    expect(getAtPath(obj, "user.profile.email")).toBe("ada@example.com");
    expect(getAtPath(obj, "items[0].price")).toBe(10);
  });

  it("returns undefined for missing paths", () => {
    expect(getAtPath(obj, "user.age")).toBeUndefined();
    expect(getAtPath(obj, "missing")).toBeUndefined();
  });
});

describe("setAtPath", () => {
  it("sets a top-level key", () => {
    const obj: Record<string, JsonValue> = {};
    expect(setAtPath(obj, "name", "Ada")).toEqual({ ok: true });
    expect(obj).toEqual({ name: "Ada" });
  });

  it("creates intermediate objects", () => {
    const obj: Record<string, JsonValue> = {};
    expect(setAtPath(obj, "settings.notifications", ["a"])).toEqual({
      ok: true,
    });
    expect(obj).toEqual({ settings: { notifications: ["a"] } });
  });

  it("overwrites existing nested values", () => {
    const obj = { settings: { theme: "dark" } };
    expect(setAtPath(obj, "settings.notifications", ["x"])).toEqual({
      ok: true,
    });
    expect(obj).toEqual({ settings: { theme: "dark", notifications: ["x"] } });
  });
});

describe("deleteAtPath", () => {
  it("deletes a top-level key", () => {
    const obj = { a: 1, b: 2 };
    expect(deleteAtPath(obj, "a")).toEqual({ ok: true });
    expect(obj).toEqual({ b: 2 });
  });

  it("deletes a nested key", () => {
    const obj = { user: { name: "Ada", age: 30 } };
    expect(deleteAtPath(obj, "user.age")).toEqual({ ok: true });
    expect(obj).toEqual({ user: { name: "Ada" } });
  });

  it("returns PATH_NOT_FOUND for missing paths", () => {
    const obj = { user: { name: "Ada" } };
    expect(deleteAtPath(obj, "user.email")).toEqual({
      ok: false,
      reason: "PATH_NOT_FOUND",
    });
  });
});

describe("moveAtPath", () => {
  it("moves a value to a nested path", () => {
    const obj = { notifications: ["a"], name: "Ada" };
    expect(moveAtPath(obj, "notifications", "settings.notifications")).toEqual({
      ok: true,
    });
    expect(obj).toEqual({
      name: "Ada",
      settings: { notifications: ["a"] },
    });
  });

  it("returns PATH_NOT_FOUND when from is missing", () => {
    const obj = { name: "Ada" };
    expect(moveAtPath(obj, "notifications", "settings.notifications")).toEqual({
      ok: false,
      reason: "PATH_NOT_FOUND",
    });
  });

  it("returns STRUCTURAL_CONFLICT when to already exists", () => {
    const obj = { notifications: ["a"], settings: { notifications: ["b"] } };
    expect(moveAtPath(obj, "notifications", "settings.notifications")).toEqual({
      ok: false,
      reason: "STRUCTURAL_CONFLICT",
    });
    expect(obj).toEqual({
      notifications: ["a"],
      settings: { notifications: ["b"] },
    });
  });
});
