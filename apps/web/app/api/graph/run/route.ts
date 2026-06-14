import { runGraph, validateGraph, type TransformGraph } from "@json-transformer/core";
import { NextResponse } from "next/server";

const MAX_BODY_BYTES = 1_048_576;

export async function POST(request: Request) {
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { output: null, errors: [{ type: "DSL_INVALID", message: "Payload too large" }] },
        { status: 413 },
      );
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { output: null, errors: [{ type: "DSL_INVALID", message: "Invalid JSON body" }] },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("graph" in body) ||
    !("input" in body)
  ) {
    return NextResponse.json(
      {
        output: null,
        errors: [
          {
            type: "DSL_INVALID",
            message: 'Body must include "graph" and "input" fields',
          },
        ],
      },
      { status: 400 },
    );
  }

  const { graph, input } = body as { graph: TransformGraph; input: unknown };

  const validation = validateGraph(graph);
  if (!validation.valid) {
    return NextResponse.json(
      {
        output: null,
        errors: validation.errors.map((message) => ({
          type: "GRAPH_INVALID",
          message,
        })),
      },
      { status: 422 },
    );
  }

  const result = runGraph(input, graph);
  return NextResponse.json(result);
}
