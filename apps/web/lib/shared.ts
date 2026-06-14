export const SAMPLE_INPUT = JSON.stringify(
  {
    user: {
      first: "John",
      last: "Doe",
      age: 25,
      contact: { email: "john@example.com" },
    },
    users: [
      { name: "Ada", email: "ada@example.com", active: true },
      { name: "Linus", email: "linus@example.com", active: false },
    ],
    items: [
      { name: "Keyboard", price: 49 },
      { name: "Mouse", price: 25 },
    ],
  },
  null,
  2,
);

export const SAMPLE_DSL = JSON.stringify(
  {
    fullName: "$user.first + ' ' + $user.last",
    isAdult: "$user.age > 18",
    email: "user.contact.email",
    firstItem: "items[0].name",
    emails: "users[].email",
    source: "api",
  },
  null,
  2,
);
