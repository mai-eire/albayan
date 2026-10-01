import { defineConfig } from "@playwright/test";

// `pnpm test:e2e`: migrates and seeds a separate Wrangler state directory (e2e/prepare.mts),
// starts the app on its own port against it, then runs the flows in e2e/.
const port = 3210;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  // Everything here runs against `next dev`, which compiles a route the first time it is
  // asked for, and against server actions that notify a whole class. 5s is a production
  // default; these waits are for a development server on a busy laptop — and a CI runner
  // has two cores, where the first sign-in pays for compiling the page it lands on.
  expect: { timeout: process.env.CI ? 30_000 : 15_000 },
  // One shared dev server and one local D1: parallel specs made requests hang under load.
  workers: 1,
  // Not for concurrency — `workers: 1` still runs one test at a time. Without this every
  // file is one indivisible unit for `--shard`, and pages.spec.ts holds 98 of 107 tests,
  // so three shards split 101/0/6. Per-test grouping makes it 48/37/22.
  fullyParallel: true,
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
