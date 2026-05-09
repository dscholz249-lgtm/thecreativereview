import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    capture_pageleave: true,
    session_recording: { sampleRate: 0.1 },
  });
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,
  debug: false,
  // "Failed to fetch" / "Load failed" surface from three sources we
  // can't act on: ad-blocker-blocked GA pings, browser-extension
  // injected fetch instrumentation, and route prefetches that abort
  // when the user clicks before the prefetch finishes. None of these
  // are real signal — the actual signup submit failure path renders
  // its own inline error from the action result.
  ignoreErrors: [
    "TypeError: Failed to fetch",
    "TypeError: NetworkError when attempting to fetch resource.",
    "TypeError: Load failed",
    "AbortError: The user aborted a request.",
    "AbortError: signal is aborted without reason",
  ],
  // Drops errors whose stack frames are entirely inside browser
  // extension scripts. The Sentry-side regex is matched against the
  // top frame's URL, so `app:///` (Chromium extension scheme) and
  // `chrome-extension://` are both covered.
  denyUrls: [/^app:\/\//, /^chrome-extension:\/\//, /^moz-extension:\/\//],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
