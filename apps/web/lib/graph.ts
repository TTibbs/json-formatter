import type {
  GraphEdge,
  GraphNode,
  GraphNodeType,
  TransformGraph,
} from "@json-transformer/core";

let nodeCounter = 0;

export function newNodeId(prefix = "node"): string {
  nodeCounter++;
  return `${prefix}_${nodeCounter}`;
}

export function createEmptyGraph(): TransformGraph {
  return {
    id: "graph",
    version: 2,
    nodes: [
      { id: "input", type: "input" },
      { id: "output", type: "output" },
    ],
    edges: [{ from: "input", to: "output" }],
  };
}

export function createSampleGraph(): TransformGraph {
  return {
    id: "sample-notifications",
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
}

export const ADDABLE_NODE_TYPES: { value: GraphNodeType; label: string }[] = [
  { value: "map", label: "Map array" },
  { value: "nest", label: "Nest / move" },
  { value: "rename", label: "Rename" },
  { value: "remove", label: "Remove" },
  { value: "pick", label: "Pick fields" },
  { value: "flatten", label: "Flatten" },
  { value: "project", label: "Project (output DSL)" },
];

export function defaultConfigForType(type: GraphNodeType): GraphNode["config"] {
  switch (type) {
    case "map":
      return { source: "users", body: [] };
    case "nest":
      return { from: "field", to: "nested.field" };
    case "rename":
      return { map: { oldKey: "newKey" } };
    case "remove":
      return { paths: ["fieldToRemove"] };
    case "pick":
      return { paths: { outputKey: "input.path" } };
    case "flatten":
      return { mappings: { flatKey: "nested.path" } };
    case "project":
      return { root: { type: "object", entries: {} } };
    default:
      return {};
  }
}

export function addNode(graph: TransformGraph, type: GraphNodeType): TransformGraph {
  const id = newNodeId(type);
  const node: GraphNode = { id, type, config: defaultConfigForType(type) };
  return { ...graph, nodes: [...graph.nodes, node] };
}

export function removeNode(graph: TransformGraph, nodeId: string): TransformGraph {
  if (nodeId === "input" || nodeId === "output") return graph;

  const nodes = graph.nodes.filter((n) => n.id !== nodeId);
  const edges = graph.edges.filter(
    (e) => e.from !== nodeId && e.to !== nodeId,
  );

  const cleanedNodes = nodes.map((n) => {
    if (n.type !== "map") return n;
    const cfg = n.config as { source: string; body: string[] };
    return {
      ...n,
      config: {
        ...cfg,
        body: cfg.body.filter((id) => id !== nodeId),
      },
    };
  });

  return { ...graph, nodes: cleanedNodes, edges };
}

export function updateNode(
  graph: TransformGraph,
  nodeId: string,
  patch: Partial<GraphNode>,
): TransformGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === nodeId ? { ...n, ...patch, id: n.id, type: patch.type ?? n.type } : n,
    ),
  };
}

export function addEdge(
  graph: TransformGraph,
  from: string,
  to: string,
): TransformGraph {
  if (!from || !to || from === to) return graph;
  if (graph.edges.some((e) => e.from === from && e.to === to)) return graph;
  return { ...graph, edges: [...graph.edges, { from, to }] };
}

export function removeEdge(graph: TransformGraph, index: number): TransformGraph {
  return { ...graph, edges: graph.edges.filter((_, i) => i !== index) };
}

export function serializeGraph(graph: TransformGraph): string {
  return JSON.stringify(graph, null, 2);
}

export function parseGraph(text: string): TransformGraph | null {
  try {
    const parsed = JSON.parse(text) as TransformGraph;
    if (parsed.version !== 2 || !Array.isArray(parsed.nodes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function flowNodeIds(graph: TransformGraph): string[] {
  return graph.nodes
    .filter((n) => n.type !== "input" && n.type !== "output")
    .map((n) => n.id);
}

export function allNodeIds(graph: TransformGraph): string[] {
  return graph.nodes.map((n) => n.id);
}

export type { TransformGraph, GraphNode, GraphEdge };
