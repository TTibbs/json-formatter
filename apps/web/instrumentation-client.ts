import posthog from "posthog-js";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const enableInDev =
  process.env.NEXT_PUBLIC_POSTHOG_ENABLE_DEV === "true" ||
  process.env.NEXT_PUBLIC_POSTHOG_DEBUG === "true";
const isDev = process.env.NODE_ENV === "development";

if (token && (!isDev || enableInDev)) {
  posthog.init(token, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: !isDev,
    debug: process.env.NEXT_PUBLIC_POSTHOG_DEBUG === "true",
  });
}
