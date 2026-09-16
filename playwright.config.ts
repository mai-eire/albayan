import { defineConfig } from "@playwright/test";

// `pnpm test:e2e`: migrates and seeds a separate Wrangler state directory (e2e/prepare.mts),
// starts the app on its own port against it, then runs the flows in e2e/.
const port = 3210;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  // One shared dev server and one local D1: parallel specs made requests hang under load.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    // Uses the installed Chrome locally (no download); CI installs chromium and sets this.
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm exec tsx e2e/prepare.mts && pnpm exec next dev -p ${port}`,
    url: `http://localhost:${port}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { WRANGLER_STATE: ".wrangler/e2e/v3", EMAIL_DIR: ".dev/e2e-mail" },
  },
});
