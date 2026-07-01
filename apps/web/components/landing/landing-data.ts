import { transform } from "@json-transformer/core";
import type {
  WorkflowEdge,
  WorkflowNode,
} from "@/components/workflow-canvas/workflow-canvas-types";

export const ANCHORS = {
  examples: "examples",
  howItWorks: "how-it-works",
} as const;

export const DATA_MISMATCHES = [
  {
    source: "API response",
    target: "frontend model",
    before: 'full_name: "Ada Lovelace"',
    after: 'name: "Ada Lovelace"',
  },
  {
    source: "Webhook payload",
    target: "database shape",
    before: 'type: "order.created"',
    after: 'event: "order.created"',
  },
  {
    source: "AI output",
    target: "predictable schema",
    before: 'text: "..."',
    after: "choices: [...]",
  },
] as const;

export const DEMO_INPUT = {
  user: {
    profile: {
      name: "Terry",
      email: "terry@example.com",
    },
  },
};

export const DEMO_DSL = {
  name: "user.profile.name",
  email: "user.profile.email",
};

export const DEMO_INPUT_JSON = JSON.stringify(DEMO_INPUT, null, 2);
export const DEMO_DSL_JSON = JSON.stringify(DEMO_DSL, null, 2);
export const DEMO_OUTPUT_JSON = JSON.stringify(
  transform(DEMO_INPUT, DEMO_DSL).output,
  null,
  2,
);

export type HowItWorksPreview =
  | { type: "code"; code: string; language?: "json" }
  | { type: "workflow" };

export type HowItWorksStep = {
  title: string;
  description: string;
  preview: HowItWorksPreview;
};

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    title: "Paste JSON",
    description: "Drop a payload from an API, webhook, or model output.",
    preview: {
      type: "code",
      code: `{
  "users": [
    { "name": "Ada", "role": "admin" }
  ]
}`,
    },
  },
  {
    title: "Define Transformation",
    description: "Map fields, flatten nesting, or chain pipeline steps.",
    preview: {
      type: "code",
      code: `{
  "teamLead": "users[0].name",
  "isAdmin": "$users[0].role == 'admin'"
}`,
    },
  },
  {
    title: "Preview Output",
    description: "See the reshaped JSON update live as you edit.",
    preview: { type: "workflow" },
  },
  {
    title: "Reuse Anywhere",
    description: "Save the transform and run it again on the next payload.",
    preview: {
      type: "code",
      code: `{
  "teamLead": "Ada",
  "isAdmin": true
}`,
    },
  },
];

export const LANDING_WORKFLOW_NODES: WorkflowNode[] = [
  {
    id: "step-paste",
    type: "input",
    position: { x: 0, y: 60 },
    data: { label: "Paste JSON", description: "Raw payload in" },
  },
  {
    id: "step-define",
    type: "transform",
    position: { x: 200, y: 60 },
    data: { label: "Define Transform", description: "DSL or builder" },
  },
  {
    id: "step-preview",
    type: "preview",
    position: { x: 400, y: 60 },
    data: { label: "Preview Output", description: "Live diff" },
  },
  {
    id: "step-reuse",
    type: "output",
    position: { x: 600, y: 60 },
    data: { label: "Reuse Anywhere", description: "Export & share" },
  },
];

export const LANDING_WORKFLOW_EDGES: WorkflowEdge[] = [
  {
    id: "edge-paste-define",
    source: "step-paste",
    target: "step-define",
    sourceHandle: "output",
    targetHandle: "input",
    animated: true,
  },
  {
    id: "edge-define-preview",
    source: "step-define",
    target: "step-preview",
    sourceHandle: "output",
    targetHandle: "input",
    animated: true,
  },
  {
    id: "edge-preview-reuse",
    source: "step-preview",
    target: "step-reuse",
    sourceHandle: "output",
    targetHandle: "input",
    animated: true,
  },
];

export type TransformationExample = {
  id: string;
  label: string;
  input: string;
  transform: string;
  output: string;
};

function buildExample(
  label: string,
  id: string,
  input: Record<string, unknown>,
  dsl: Record<string, unknown>,
): TransformationExample {
  return {
    id,
    label,
    input: JSON.stringify(input, null, 2),
    transform: JSON.stringify(dsl, null, 2),
    output: JSON.stringify(transform(input, dsl as never).output, null, 2),
  };
}

export const TRANSFORMATION_EXAMPLES: TransformationExample[] = [
  buildExample(
    "Flatten",
    "flatten",
    {
      author: {
        profile: {
          display_name: "Ada Lovelace",
          avatar_url: "https://cdn.example.com/u/ada.png",
        },
      },
      attributes: { title: "Designing safe JSON transforms" },
    },
    {
      display_name: "author.profile.display_name",
      avatar_url: "author.profile.avatar_url",
      title: "attributes.title",
    },
  ),
  buildExample(
    "Rename",
    "rename",
    {
      orders: [
        {
          lines: [
            { sku: "KB-01", legacy: true, qty: 1 },
            { sku: "MS-02", legacy: false, qty: 2 },
          ],
        },
      ],
    },
    {
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
  ),
  buildExample(
    "Filter",
    "filter",
    {
      oldName: "Jane Doe",
      internalId: 9901,
      email: "jane@example.com",
      extra: "dropped by pick",
    },
    {
      name: "oldName",
      email: "email",
    },
  ),
  buildExample(
    "Map",
    "map",
    {
      users: [
        { name: "Ada", email: "ada@example.com", role: "admin" },
        { name: "Linus", email: "linus@example.com", role: "member" },
      ],
    },
    {
      names: "users[].name",
      emails: "users[].email",
    },
  ),
  buildExample(
    "Merge",
    "merge",
    {
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
    },
    {
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
  ),
  buildExample(
    "Extract",
    "extract",
    DEMO_INPUT as Record<string, unknown>,
    DEMO_DSL,
  ),
];
