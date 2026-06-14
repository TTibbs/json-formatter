export const SAMPLE_INPUT = JSON.stringify(
  {
    users: [
      {
        name: "Ada",
        email: "ada@example.com",
        active: true,
        notifications: ["ping", "mention"],
      },
      {
        name: "Linus",
        email: "linus@example.com",
        active: false,
        notifications: ["alert"],
      },
    ],
    items: [
      { name: "Keyboard", price: 49 },
      { name: "Mouse", price: 25 },
    ],
  },
  null,
  2,
);

/**
 * Default transform sample — fully builder-compatible.
 *
 * Builder mapping:
 * - Map field: email, firstItem
 * - Compute: fullName, isAdult
 * - Map array (users → name / email / notifications): names, emails, notifications
 * - Fixed value: source
 */
export const SAMPLE_DSL = JSON.stringify(
  {
    firstItem: "items[0].name",
    names: "users[].name",
    emails: "users[].email",
    notifications: "users[].notifications",
    source: "api",
  },
  null,
  2,
);

/**
 * DSL-only pipeline sample — nest each user's notifications under settings.
 * Use the DSL tab (builder cannot edit $pipeline steps).
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
