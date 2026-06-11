import { describe, expect, it } from "vitest";
import { inferFields, type FieldNode } from "../schema/fields";

function find(nodes: FieldNode[], key: string): FieldNode | undefined {
  return nodes.find((n) => n.key === key);
}

describe("inferFields", () => {
  it("infers scalar, object, and array fields with absolute paths", () => {
    const fields = inferFields({
      name: "Ada",
      age: 36,
      active: true,
      user: { contact: { email: "a@b.c" } },
      tags: ["x", "y"],
    });

    expect(find(fields, "name")).toMatchObject({
      path: "name",
      kind: "value",
      valueType: "string",
    });
    expect(find(fields, "age")).toMatchObject({ valueType: "number" });
    expect(find(fields, "active")).toMatchObject({ valueType: "boolean" });

    const user = find(fields, "user")!;
    expect(user.kind).toBe("object");
    const contact = find(user.children!, "contact")!;
    expect(find(contact.children!, "email")).toMatchObject({
      path: "user.contact.email",
      kind: "value",
      valueType: "string",
    });

    expect(find(fields, "tags")).toMatchObject({
      kind: "array",
      valueType: "string",
    });
  });

  it("gives array children item-relative paths", () => {
    const fields = inferFields({
      users: [{ name: "Ada", contact: { email: "a@b.c" } }],
    });

    const users = find(fields, "users")!;
    expect(users.path).toBe("users");
    expect(find(users.children!, "name")).toMatchObject({ path: "name" });
    const contact = find(users.children!, "contact")!;
    expect(find(contact.children!, "email")).toMatchObject({
      path: "contact.email",
    });
  });

  it("merges keys and types across sampled array items", () => {
    const fields = inferFields({
      events: [
        { id: 1, kind: "click" },
        { id: 2, region: "eu" },
        { id: "three" },
      ],
    });

    const events = find(fields, "events")!;
    const keys = events.children!.map((c) => c.key);
    expect(keys).toEqual(["id", "kind", "region"]);
    expect(find(events.children!, "id")).toMatchObject({ valueType: "mixed" });
    expect(find(events.children!, "kind")).toMatchObject({
      valueType: "string",
    });
  });

  it("marks heterogeneous arrays as mixed", () => {
    const fields = inferFields({ stuff: [1, { a: 1 }] });
    expect(find(fields, "stuff")).toMatchObject({
      kind: "array",
      valueType: "mixed",
    });
  });

  it("handles root arrays and non-object roots", () => {
    const rootArr = inferFields([{ a: 1 }]);
    expect(rootArr).toHaveLength(1);
    expect(rootArr[0]).toMatchObject({ kind: "array", path: "" });
    expect(find(rootArr[0].children!, "a")).toMatchObject({ path: "a" });

    expect(inferFields("scalar")).toEqual([]);
    expect(inferFields(null)).toEqual([]);
    expect(inferFields(undefined)).toEqual([]);
  });

  it("caps total node count on huge inputs", () => {
    const wide: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) wide[`k${i}`] = i;

    const fields = inferFields(wide);
    expect(fields.length).toBeLessThanOrEqual(500);
  });
});
