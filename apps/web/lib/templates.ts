import type { JsonValue } from "@json-transformer/core";
import {
  createDeepSortGraph,
  createReshapeAndProjectGraph,
  type TransformGraph,
} from "./graph";
import { TEAM_DIRECTORY_INPUT } from "./shared";

export type TemplateCategory =
  | "Guides"
  | "E-commerce"
  | "Payments"
  | "APIs";

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  /** Realistic (trimmed) sample payload to load into the Input panel. */
  input: Record<string, JsonValue>;
  /**
   * The transform. Must stay flat-builder compatible (no nested output
   * objects, simple conditions/concats only) and produce zero warnings
   * against `input` — enforced by templates.test.ts.
   * Set `dslOnly: true` for $pipeline transforms that the builder cannot represent.
   */
  dsl: Record<string, JsonValue>;
  dslOnly?: boolean;
  preferredMode?: "builder" | "dsl" | "graph";
  graph?: TransformGraph;
}

export const TEMPLATES: Template[] = [
  {
    id: "guide-builder-concat",
    name: "Builder: Concat fields",
    category: "Guides",
    description:
      "Join two user names with a separator using an explicit concat expression.",
    input: TEAM_DIRECTORY_INPUT,
    dsl: {
      roster: "$users[0].name + ' / ' + $users[1].name",
    },
    preferredMode: "builder",
  },
  {
    id: "guide-builder-if-else",
    name: "Builder: If / Else tier",
    category: "Guides",
    description:
      "Pick elevated or standard access based on the first user's role.",
    input: TEAM_DIRECTORY_INPUT,
    dsl: {
      access: {
        if: "$users[0].role == 'admin'",
        then: "elevated",
        else: "standard",
      },
    },
    preferredMode: "builder",
  },
  {
    id: "guide-sort-top",
    name: "Sort output keys (A-Z)",
    category: "Guides",
    description: "Reorder top-level output field names alphabetically with $sort.",
    input: TEAM_DIRECTORY_INPUT,
    dsl: {
      $sort: "alphabetical",
      z_field: "users[0].name",
      a_field: "users[1].email",
      m_field: "users[0].role",
    },
    preferredMode: "builder",
  },
  {
    id: "guide-sort-deep",
    name: "Sort all levels (deep)",
    category: "Guides",
    description: "Deep $sort alphabetizes nested object keys in the output.",
    input: {
      z_top: "last",
      meta: { z_inner: 1, a_inner: 2 },
      users: TEAM_DIRECTORY_INPUT.users,
      a_top: "first",
    },
    dsl: {
      $sort: { deep: true },
      names: "users[].name",
      meta: "meta",
    },
    preferredMode: "builder",
  },
  {
    id: "guide-pipeline-rename-remove",
    name: "Pipeline: rename & remove",
    category: "Guides",
    description:
      "Nested foreach renames sku to productSku and drops legacy on each order line.",
    dslOnly: true,
    preferredMode: "dsl",
    input: {
      orders: [
        {
          lines: [
            { sku: "KB-01", legacy: true, qty: 1 },
            { sku: "MS-02", legacy: false, qty: 2 },
          ],
        },
      ],
    },
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
    id: "guide-graph-reshape",
    name: "Graph: reshape & project",
    category: "Guides",
    description:
      "Map users, nest notifications per item, then project names and emails arrays.",
    preferredMode: "graph",
    input: TEAM_DIRECTORY_INPUT,
    dsl: {},
    graph: createReshapeAndProjectGraph(),
  },
  {
    id: "guide-graph-deep-sort",
    name: "Graph: deep sort output",
    category: "Guides",
    description: "Project output fields, then sort keys at all levels with a sort node.",
    preferredMode: "graph",
    input: TEAM_DIRECTORY_INPUT,
    dsl: {},
    graph: createDeepSortGraph(),
  },
  {
    id: "shopify-hubspot",
    name: "Shopify Customer -> HubSpot Contact",
    category: "E-commerce",
    description:
      "Turn a Shopify customer into a HubSpot contact: joined full name, lifecycle stage from order history, and one city per saved address.",
    input: {
      customer: {
        id: 7064055069,
        email: "jane.doe@example.com",
        first_name: "Jane",
        last_name: "Doe",
        accepts_marketing: true,
        orders_count: 12,
        total_spent: "734.50",
        addresses: [
          { city: "Austin", province: "Texas", country: "United States", zip: "78701" },
          { city: "Denver", province: "Colorado", country: "United States", zip: "80202" },
        ],
      },
    },
    dsl: {
      email: "customer.email",
      fullname: "$customer.first_name + ' ' + $customer.last_name",
      lifecyclestage: {
        if: "$customer.orders_count > 0",
        then: "customer",
        else: "lead",
      },
      marketing_opt_in: "customer.accepts_marketing",
      cities: "customer.addresses[].city",
      hs_source: "shopify",
    },
  },
  {
    id: "stripe-crm",
    name: "Stripe Customer -> CRM Contact",
    category: "Payments",
    description:
      "Map a Stripe customer to a CRM contact: pull company and plan out of metadata and flag delinquent accounts as at-risk.",
    input: {
      id: "cus_OWk3PQpzXkU9aF",
      email: "jane.doe@example.com",
      name: "Jane Doe",
      delinquent: false,
      currency: "usd",
      created: 1717420800,
      metadata: { company: "Acme Inc", plan: "growth" },
    },
    dsl: {
      contactId: "$id",
      email: "$email",
      name: "$name",
      company: "metadata.company",
      plan: "metadata.plan",
      status: { if: "$delinquent", then: "at-risk", else: "active" },
      source: "stripe",
    },
  },
  {
    id: "stripe-invoice-accounting",
    name: "Stripe Invoice -> Accounting Entry",
    category: "Payments",
    description:
      "Convert a Stripe invoice into an accounting entry: cents to currency units, paid flag from status, and a list of line descriptions.",
    input: {
      invoice: {
        number: "INV-0042",
        amount_due: 24999,
        amount_paid: 24999,
        currency: "usd",
        status: "paid",
        customer_email: "billing@acme.com",
        lines: [
          { description: "Growth plan (monthly)", amount: 19999 },
          { description: "Extra seats x2", amount: 5000 },
        ],
      },
    },
    dsl: {
      reference: "invoice.number",
      billedTo: "invoice.customer_email",
      totalDue: "$invoice.amount_due / 100",
      totalPaid: "$invoice.amount_paid / 100",
      currency: "invoice.currency",
      isPaid: { if: "$invoice.status == 'paid'", then: true, else: false },
      lineDescriptions: "invoice.lines[].description",
    },
  },
  {
    id: "api-dto",
    name: "API Response -> Frontend DTO",
    category: "APIs",
    description:
      "Flatten a deeply nested JSON:API-style response into the lean DTO your frontend actually renders.",
    input: {
      data: {
        id: 81723,
        type: "article",
        attributes: {
          title: "Designing safe JSON transforms",
          published_at: "2026-05-28T09:00:00Z",
          reading_time_minutes: 7,
        },
        author: {
          profile: {
            display_name: "Ada Lovelace",
            avatar_url: "https://cdn.example.com/u/ada.png",
          },
        },
      },
      included: [
        { id: 1, tag: "engineering" },
        { id: 2, tag: "json" },
      ],
      meta: { request_id: "req_9f81b2", cache: "MISS" },
    },
    dsl: {
      id: "data.id",
      title: "data.attributes.title",
      publishedAt: "data.attributes.published_at",
      readingMinutes: "data.attributes.reading_time_minutes",
      authorName: "data.author.profile.display_name",
      avatarUrl: "data.author.profile.avatar_url",
      tags: "included[].tag",
    },
  },
  {
    id: "order-fulfillment",
    name: "Order -> Fulfillment Payload",
    category: "E-commerce",
    description:
      "Shape an order into what the fulfillment service expects: a joined address line, the SKU list, and a shipping service picked from the express flag.",
    input: {
      order: {
        id: "ORD-1042",
        express: true,
        shipping_address: {
          name: "Jane Doe",
          street: "500 Main St",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        line_items: [
          { sku: "KB-01", title: "Keyboard", quantity: 1 },
          { sku: "MS-02", title: "Mouse", quantity: 2 },
        ],
      },
    },
    dsl: {
      orderId: "order.id",
      recipient: "order.shipping_address.name",
      addressLine:
        "$order.shipping_address.street + ', ' + $order.shipping_address.city + ', ' + $order.shipping_address.state",
      zip: "order.shipping_address.zip",
      skus: "order.line_items[].sku",
      service: { if: "$order.express", then: "express", else: "standard" },
    },
  },
  {
    id: "webhook-notification",
    name: "Webhook Event -> Notification",
    category: "APIs",
    description:
      "Summarize a CI webhook into a notification: repo title from owner/name, a message that depends on the status, and a fixed channel.",
    input: {
      event: {
        type: "deployment.finished",
        status: "success",
        repo: { name: "json-transformer", owner: "tward" },
        actor: { username: "tward" },
        duration_seconds: 142,
      },
    },
    dsl: {
      title: "$event.repo.owner + '/' + $event.repo.name",
      message: {
        if: "$event.status == 'success'",
        then: "Deployment finished",
        else: "Deployment failed",
      },
      triggeredBy: "event.actor.username",
      durationSeconds: "event.duration_seconds",
      channel: "deployments",
    },
  },
  {
    id: "user-notifications-nest",
    name: "Nest User Notifications",
    category: "APIs",
    description:
      "Move a top-level notifications array under settings.notifications for every user — preserves other fields on each item.",
    dslOnly: true,
    input: {
      users: [
        { id: 1, name: "Ada", notifications: ["ping"] },
        { id: 2, name: "Bob", notifications: ["alert"] },
      ],
    },
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
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Guides",
  "E-commerce",
  "Payments",
  "APIs",
];
