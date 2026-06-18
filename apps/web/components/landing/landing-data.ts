import { transform } from "@json-transformer/core";
import type { PricingPlan } from "@/components/pricing-section/types";
import type {
  WorkflowEdge,
  WorkflowNode,
} from "@/components/workflow-canvas/workflow-canvas-types";

export const ANCHORS = {
  examples: "examples",
  pricing: "pricing",
  howItWorks: "how-it-works",
} as const;

export const ROTATING_PHRASES = [
  "Reshape APIs",
  "Normalise AI Outputs",
  "Map Data Between Systems",
  "Transform Payloads",
] as const;

export const PROBLEM_CARDS = [
  {
    tag: "API mismatch",
    statement: "API response doesn't match your frontend.",
    hue: 200,
  },
  {
    tag: "AI drift",
    statement: "AI output shape changes and breaks downstream systems.",
    hue: 280,
  },
  {
    tag: "Webhook gap",
    statement: "Webhook payloads don't match your database schema.",
    hue: 160,
  },
] as const;

export function problemCardImage(hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${hue},65%,28%)"/><stop offset="100%" stop-color="hsl(${hue + 35},55%,14%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

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
export const DEMO_OUTPUT_JSON = JSON.stringify(
  transform(DEMO_INPUT, DEMO_DSL).output,
  null,
  2,
);

export const HOW_IT_WORKS_STEPS = [
  {
    title: "Paste JSON",
    description: "Drop a payload from an API, webhook, or model output.",
  },
  {
    title: "Define Transformation",
    description: "Map fields, flatten nesting, or chain pipeline steps.",
  },
  {
    title: "Preview Output",
    description: "See the reshaped JSON update live as you edit.",
  },
  {
    title: "Reuse Anywhere",
    description: "Save the transform and run it again on the next payload.",
  },
] as const;

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

export const USE_CASES = [
  {
    title: "API Integrations",
    description:
      "Connect systems with completely different payload structures.",
  },
  {
    title: "AI Pipelines",
    description: "Normalise model outputs before they reach production.",
  },
  {
    title: "Frontend Mapping",
    description: "Convert API responses into UI-friendly structures.",
  },
  {
    title: "Legacy Migration",
    description: "Move between old and new schemas without custom scripts.",
  },
  {
    title: "ETL",
    description: "Transform data between processing stages.",
  },
] as const;

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

export const COMPARISON_LEFT = {
  title: "Prompt AI Repeatedly",
  points: [
    "Token costs add up on every reshape",
    "Repeated prompting for the same mapping",
    "Inconsistent outputs between runs",
    "Hard to reuse or version",
  ],
} as const;

export const COMPARISON_RIGHT = {
  title: "Reusable Transformations",
  points: [
    "Predictable output every time",
    "Fast — no round-trip to a model",
    "Shareable transforms across your team",
    "Repeatable on the next payload",
  ],
} as const;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "For solo developers reshaping payloads locally.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "Core transform builder",
      "DSL & graph modes",
      "Live preview",
      "Copy & export output",
    ],
    ctaText: "Start Free",
  },
  {
    id: "pro",
    name: "Pro",
    description: "For developers shipping integrations every week.",
    monthlyPrice: 12,
    yearlyPrice: 108,
    features: [
      "Everything in Free",
      "Saved transforms",
      "Template library",
      "Priority support",
    ],
    ctaText: "Start Pro Trial",
    highlighted: true,
    badge: "Popular",
  },
  {
    id: "team",
    name: "Team",
    description: "For teams normalising data across services.",
    monthlyPrice: 39,
    yearlyPrice: 348,
    features: [
      "Everything in Pro",
      "Shared transform library",
      "Team collaboration",
      "Usage analytics",
    ],
    ctaText: "Contact Sales",
  },
];

export const SOCIAL_PROOF_AVATARS = [
  { id: "dev-1", alt: "Developer", fallback: "JT" },
  { id: "dev-2", alt: "Developer", fallback: "AK" },
  { id: "dev-3", alt: "Developer", fallback: "MR" },
] as const;
