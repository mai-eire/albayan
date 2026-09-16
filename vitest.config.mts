import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    include: ["{lib,app,test}/**/*.test.{ts,tsx}"],
    testTimeout: 20_000,
    // Each integration file boots its own local D1 (workerd); with many files in parallel
    // that setup can take a while.
    hookTimeout: 60_000,
  },
});
