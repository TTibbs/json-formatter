import type { JsonValue } from "@json-transformer/core";
import {
  createDeepSortGraph,
  createFlattenGraph,
  createReshapeAndProjectGraph,
  createStructuralGraph,
  serializeGraph,
  type TransformGraph,
} from "./graph";

export type WorkbenchEditorMode = "builder" | "dsl" | "graph";

export interface WorkbenchExample {
  id: string;
  title: string;
  description: string;
  mode: WorkbenchEditorMode;
  input: Record<string, JsonValue>;
  dsl?: Record<string, JsonValue>;
  graph?: TransformGraph;
}

/** Team directory payload used by builder, DSL pipeline, and reshape graph samples. */
export const TEAM_DIRECTORY_INPUT: Record<string, JsonValue> = {
  users: [
    {
      name: "Ada",
      email: "ada@example.com",
      role: "admin",
      notifications: ["ping", "mention"],
    },
    {
      name: "Linus",
      email: "linus@example.com",
      role: "member",
      notifications: ["alert"],
    },
  ],
};

const MESSY_NESTED_INPUT: Record<string, JsonValue> = {
  z_top: "last",
  meta: { z_inner: 1, a_inner: 2 },
  users: TEAM_DIRECTORY_INPUT.users,
  a_top: "first",
};

const ORDER_LINES_INPUT: Record<string, JsonValue> = {
  orders: [
    {
      lines: [
        { sku: "KB-01", legacy: true, qty: 1 },
        { sku: "MS-02", legacy: false, qty: 2 },
      ],
    },
  ],
};

const STRUCTURAL_INPUT: Record<string, JsonValue> = {
  oldName: "Jane Doe",
  internalId: 9901,
  email: "jane@example.com",
  extra: "dropped by pick",
};

const FLATTEN_INPUT: Record<string, JsonValue> = {
  author: {
    profile: {
      display_name: "Ada Lovelace",
      avatar_url: "https://cdn.example.com/u/ada.png",
    },
  },
  attributes: { title: "Designing safe JSON transforms" },
};

export const WORKBENCH_EXAMPLES: WorkbenchExample[] = [
  {
    id: "builder-all-ops",
    title: "All builder operations",
    description:
      "Path, expression, map array, literal, concat, and if/else in one flat transform.",
    mode: "builder",
    input: TEAM_DIRECTORY_INPUT,
    dsl: {
      teamLead: "users[0].name",
      names: "users[].name",
      emails: "users[].email",
      exportedFrom: "team-directory",
      isAdmin: "$users[0].role == 'admin'",
      roster: "$users[0].name + ' & ' + $users[1].name",
      access: {
        if: "$users[0].role == 'admin'",
        then: "elevated",
        else: "standard",
      },
    },
  },
  {
    id: "builder-sort-top",
    title: "Sort output keys (A-Z)",
    description: "Top-level $sort reorders output field names alphabetically.",
    mode: "builder",
    input: TEAM_DIRECTORY_INPUT,
    dsl: {
      $sort: "alphabetical",
      z_field: "users[0].name",
      a_field: "users[1].email",
      m_field: "users[0].role",
    },
  },
  {
    id: "builder-sort-deep",
    title: "Sort all levels (deep)",
    description: "Deep $sort alphabetizes nested object keys throughout the output.",
    mode: "builder",
    input: MESSY_NESTED_INPUT,
    dsl: {
      $sort: { deep: true },
      names: "users[].name",
      meta: "meta",
    },
  },
  {
    id: "dsl-pipeline-nest",
    title: "Pipeline: nest notifications",
    description: "foreach + move nests notifications under settings on each user.",
    mode: "dsl",
    input: TEAM_DIRECTORY_INPUT,
    dsl: {
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
    },
  },
  {
    id: "dsl-pipeline-rename-remove",
    title: "Pipeline: rename & remove",
    description: "Nested foreach renames sku and removes legacy on each order line.",
    mode: "dsl",
    input: ORDER_LINES_INPUT,
    dsl: {
      $pipeline: [
        {
          foreach: "orders",
          steps: [
            {
              foreach: "lines",
              steps: [
                { rename: { from: "sku", to: "productSku" } },
                { remove: "legacy" },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "dsl-pipeline-sort",
    title: "Pipeline: deep sort",
    description: "Pipeline sort step alphabetizes keys at all levels before output.",
    mode: "dsl",
    input: MESSY_NESTED_INPUT,
    dsl: {
      $pipeline: [{ sort: { deep: true } }],
      label: "a_top",
    },
  },
  {
    id: "dsl-pipeline-plus-project",
    title: "Pipeline + output fields",
    description: "Reshape users with $pipeline, then project names and emails.",
    mode: "dsl",
    input: TEAM_DIRECTORY_INPUT,
    dsl: {
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
      names: "users[].name",
      emails: "users[].email",
    },
  },
  {
    id: "graph-reshape-and-project",
    title: "Graph: reshape & project",
    description: "Map users, nest notifications per item, then project names and emails.",
    mode: "graph",
    input: TEAM_DIRECTORY_INPUT,
    graph: createReshapeAndProjectGraph(),
  },
  {
    id: "graph-deep-sort",
    title: "Graph: deep sort output",
    description: "Project output fields, then sort keys at all levels.",
    mode: "graph",
    input: TEAM_DIRECTORY_INPUT,
    graph: createDeepSortGraph(),
  },
  {
    id: "graph-structural",
    title: "Graph: rename, remove & pick",
    description: "Structural nodes reshape the document without map or project.",
    mode: "graph",
    input: STRUCTURAL_INPUT,
    graph: createStructuralGraph(),
  },
  {
    id: "graph-flatten",
    title: "Graph: flatten nested paths",
    description: "Flatten node pulls nested author and attribute fields to the top level.",
    mode: "graph",
    input: FLATTEN_INPUT,
    graph: createFlattenGraph(),
  },
];

export function getExampleById(id: string): WorkbenchExample | undefined {
  return WORKBENCH_EXAMPLES.find((e) => e.id === id);
}

export function getDefaultExampleForMode(
  mode: WorkbenchEditorMode,
): WorkbenchExample {
  const preferred =
    mode === "builder"
      ? "builder-all-ops"
      : mode === "dsl"
        ? "dsl-pipeline-nest"
        : "graph-reshape-and-project";
  return getExampleById(preferred) ?? WORKBENCH_EXAMPLES[0];
}

/**
 * Shared input for default samples — team directory API payload.
 */
export const SAMPLE_INPUT = JSON.stringify(TEAM_DIRECTORY_INPUT, null, 2);

/** Default Builder sample — all builder operations on team directory. */
export const SAMPLE_DSL = JSON.stringify(
  getDefaultExampleForMode("builder").dsl!,
  null,
  2,
);

/** Default DSL sample — pipeline nest on team directory. */
export const SAMPLE_PIPELINE_DSL = JSON.stringify(
  getDefaultExampleForMode("dsl").dsl!,
  null,
  2,
);

/** Serialized graph sample — reshape & project flow. */
export const SAMPLE_GRAPH = serializeGraph(createReshapeAndProjectGraph());
