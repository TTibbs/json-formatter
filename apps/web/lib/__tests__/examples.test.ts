import { describe, expect, it } from "vitest";
import { runGraph, transform } from "@json-transformer/core";
import { dslToBuilder } from "../builder";
import { WORKBENCH_EXAMPLES } from "../shared";

describe("WORKBENCH_EXAMPLES catalog", () => {
  it("has unique ids", () => {
    const ids = WORKBENCH_EXAMPLES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const example of WORKBENCH_EXAMPLES) {
    describe(example.id, () => {
      if (example.mode === "graph") {
        it("runs graph with zero errors", () => {
          expect(example.graph).toBeDefined();
          const result = runGraph(example.input, example.graph!);
          expect(result.errors).toEqual([]);
        });
      } else {
        it("transforms with zero errors", () => {
          expect(example.dsl).toBeDefined();
          const result = transform(example.input, example.dsl!);
          expect(result.errors).toEqual([]);
        });
      }

      if (example.mode === "builder") {
        it("round-trips through the builder", () => {
          const parsed = dslToBuilder(JSON.stringify(example.dsl));
          expect(parsed).not.toBeNull();
          expect(parsed!.rows.length).toBeGreaterThan(0);
        });
      }
    });
  }
});
