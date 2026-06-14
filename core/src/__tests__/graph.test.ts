import { describe, expect, it } from "vitest";
import { compileToGraph, runGraph, validateGraph } from "../index";
import type { TransformGraph } from "../graph/types";

describe("validateGraph", () => {
  it("accepts a valid linear graph", () => {
    const graph: TransformGraph = {
      id: "g1",
      version: 2,
      nodes: [
        { id: "input", type: "input" },
        { id: "output", type: "output" },
      ],
      edges: [{ from: "input", to: "output" }],
    };
    expect(validateGraph(graph).valid).toBe(true);
  });

  it("rejects graphs without an input node", () => {
    const graph: TransformGraph = {
      id: "g1",
      version: 2,
      nodes: [{ id: "output", type: "output" }],
      edges: [],
    };
    expect(validateGraph(graph).valid).toBe(false);
  });

  it("rejects cyclic graphs", () => {
    const graph: TransformGraph = {
      id: "g1",
      version: 2,
      nodes: [
        { id: "a", type: "input" },
        { id: "b", type: "output" },
        { id: "c", type: "pick", config: { paths: { x: "y" } } },
      ],
      edges: [
        { from: "a", to: "c" },
        { from: "c", to: "b" },
        { from: "b", to: "c" },
      ],
    };
    expect(validateGraph(graph).valid).toBe(false);
  });
});

describe("runGraph", () => {
  it("passes input through to output", () => {
    const graph: TransformGraph = {
      id: "passthrough",
      version: 2,
      nodes: [
        { id: "input", type: "input" },
        { id: "output", type: "output" },
      ],
      edges: [{ from: "input", to: "output" }],
    };
    const input = { hello: "world" };
    expect(runGraph(input, graph).output).toEqual(input);
  });

  it("runs map + nest body nodes natively", () => {
    const graph: TransformGraph = {
      id: "map-nest",
      version: 2,
      nodes: [
        { id: "input", type: "input" },
        {
          id: "nest1",
          type: "nest",
          config: { from: "notifications", to: "settings.notifications" },
        },
        {
          id: "map1",
          type: "map",
          config: { source: "users", body: ["nest1"] },
        },
        { id: "output", type: "output" },
      ],
      edges: [
        { from: "input", to: "map1" },
        { from: "map1", to: "output" },
      ],
    };

    const input = {
      users: [{ id: 1, notifications: ["a"], name: "Ada" }],
    };

    expect(runGraph(input, graph).output).toEqual({
      users: [{ id: 1, name: "Ada", settings: { notifications: ["a"] } }],
    });
  });
});

describe("compileToGraph", () => {
  it("compiles MVP 1 DSL to input → project → output", () => {
    const { graph, errors } = compileToGraph({
      fullName: "$user.first + ' ' + $user.last",
    });
    expect(errors).toEqual([]);
    expect(graph.nodes.map((n) => n.type)).toEqual([
      "input",
      "output",
      "project",
    ]);
    expect(graph.edges).toEqual([
      { from: "input", to: "project" },
      { from: "project", to: "output" },
    ]);
  });

  it("compiles $pipeline foreach to map node with body", () => {
    const { graph } = compileToGraph({
      $pipeline: [
        {
          foreach: "users",
          steps: [
            { move: { from: "notifications", to: "settings.notifications" } },
          ],
        },
      ],
    });

    const mapNode = graph.nodes.find((n) => n.type === "map");
    expect(mapNode).toBeDefined();
    expect((mapNode!.config as { body: string[] }).body.length).toBe(1);
    expect(graph.nodes.some((n) => n.type === "nest")).toBe(true);
  });
});
