import { createSampleGraph, serializeGraph } from "./graph";

/**
 * Shared input for all default samples — a small team directory API payload.
 * Each user has top-level `notifications`; graph/pipeline samples nest those
 * under `settings.notifications` before projecting output fields.
 */
export const SAMPLE_INPUT = JSON.stringify(
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
  null,
  2,
);

/**
 * Default Builder / DSL sample — export parallel columns from `users`.
 *
 * Output:
 *   names, emails, roles → arrays; exportedFrom → fixed string
 */
export const SAMPLE_DSL = JSON.stringify(
  {
    names: "users[].name",
    emails: "users[].email",
    roles: "users[].role",
    exportedFrom: "team-directory",
  },
  null,
  2,
);

/**
 * DSL `$pipeline` sample — same structural step as the Graph tab default.
 * Nests each user's notifications under settings, then returns the full doc.
 * (Builder cannot edit $pipeline; use DSL or Graph tab.)
 */
export const SAMPLE_PIPELINE_DSL = JSON.stringify(
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
  },
  null,
  2,
);

/** Serialized graph sample — see createSampleGraph() for structure. */
export const SAMPLE_GRAPH = serializeGraph(createSampleGraph());
