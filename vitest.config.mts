import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    include: ["{lib,app,test}/**/*.test.{ts,tsx}"],
    testTimeout: 20_000,
    // Each integration file boots its own local D1 (workerd). Too many at once and they
    // starve each other, so cap the parallelism and give setup room.
    maxWorkers: 4,
    hookTimeout: 60_000,
  },
});
