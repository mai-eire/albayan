import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Stops `next dev` from appending its own block to CLAUDE.md.
  agentRules: false,
};

export default nextConfig;

// Makes Cloudflare bindings (D1, R2) available to `next dev` through Miniflare.
initOpenNextCloudflareForDev();
