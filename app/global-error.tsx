"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Fallback for errors that happen IN the root layout itself (font loading
// crash, invalid env, etc.) — these bypass the normal app/error.tsx
// boundary because the layout couldn't render. Must include its own
// <html> and <body>. Deliberately minimal: no Tailwind, no cr-* tokens
// (globals.css may not have applied), no component imports that touch
// the broken module graph. Inline styles only. Sentry still reports.

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#F5F3EE",
          color: "#0A0A0A",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
        }}
      >
        <div style={{ maxWidth: 560, width: "100%" }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#5C5C58",
              margin: "0 0 16px",
            }}
          >
            The Creative Review
          </p>
          <h1
            style={{
              margin: 0,
              fontWeight: 800,
              fontSize: 36,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            The app failed to start.
          </h1>
          <p
            style={{
              marginTop: 16,
              fontSize: 16,
              lineHeight: 1.5,
              color: "#242424",
            }}
          >
            Something crashed before we could render the app shell.
            We&apos;ve been notified. Refresh the page, or try again in
            a minute.
          </p>
          {/* Intentionally <a>, not <Link>: global-error fires when the
              root layout itself crashed, so the client router may not be
              healthy. A full-page reload is the safer recovery. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              display: "inline-block",
              marginTop: 24,
              padding: "12px 22px",
              background: "#0A0A0A",
              color: "#FFFFFF",
              textDecoration: "none",
              fontWeight: 700,
              borderRadius: 8,
              boxShadow: "2px 2px 0 #34D17E",
            }}
          >
            Reload
          </a>
          {error.digest ? (
            <p
              style={{
                marginTop: 32,
                fontSize: 12,
                color: "#5C5C58",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              Ref: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
