import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Standalone output so the Docker image can be small for Railway deploys.
  output: "standalone",
  experimental: {
    serverActions: {
      // Raised from the 1 MB default so asset uploads (PRD 7.3 caps at 25 MB)
      // reach the Server Action's size check instead of failing at the
      // framework layer with a 1MB-limit crash. Slightly above MAX_UPLOAD_BYTES
      // to leave room for multipart/form-data boundaries + other form fields.
      bodySizeLimit: "26mb",
    },
  },
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
});
