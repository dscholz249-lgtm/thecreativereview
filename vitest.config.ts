import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    // Default: unit tests. Integration tests (which hit a real local Supabase)
    // opt in with `.integration.test.ts` so we can run them separately in CI.
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    testTimeout: 15000,
  },
});
