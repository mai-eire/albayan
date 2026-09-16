import { execSync } from "node:child_process";

// Fresh migrated + seeded database for the e2e server. Wrangler's --persist-to gets the
// parent directory; getPlatformProxy (next dev, the seed script) wants the v3 folder inside.
const root = ".wrangler/e2e";
const env = {
  ...process.env,
  WRANGLER_STATE: `${root}/v3`,
  BETTER_AUTH_URL: "http://localhost:3210",
};
execSync(`pnpm exec wrangler d1 migrations apply albayan --local --persist-to ${root}`, {
  stdio: "inherit",
  env,
});
execSync("pnpm exec tsx scripts/seed.mts", { stdio: "inherit", env });
