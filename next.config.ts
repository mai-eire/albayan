import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Stops `next dev` from appending its own block to CLAUDE.md.
  agentRules: false,
  // The e2e server runs beside `pnpm dev`, so it needs its own build directory.
  distDir: process.env.WRANGLER_STATE ? ".next-e2e" : ".next",
  // The teacher area was /teach until 2026-09-19; links in old notifications and emails
  // still point there.
  redirects: async () => [
    { source: "/teach", destination: "/teacher", permanent: true },
    { source: "/teach/:path*", destination: "/teacher/:path*", permanent: true },
  ],
};

export default nextConfig;

// Makes Cloudflare bindings (D1, R2) available to `next dev` through Miniflare. E2E tests
// point WRANGLER_STATE at their own directory so they never touch the dev database.
initOpenNextCloudflareForDev({
  persist: process.env.WRANGLER_STATE ? { path: process.env.WRANGLER_STATE } : undefined,
});
