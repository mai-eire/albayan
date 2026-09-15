import { readdirSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPlatformProxy } from "wrangler";
import { dbFor, type Db } from "@/lib/db";

// A throwaway local D1 (Miniflare, in-process, no network) with all migrations applied.
export async function testDb(): Promise<{ db: Db; d1: D1Database; dispose: () => Promise<void> }> {
  const dir = mkdtempSync(join(tmpdir(), "albayan-d1-"));
  const proxy = await getPlatformProxy<CloudflareEnv>({ persist: { path: dir } });
  const d1 = proxy.env.DB;
  const migrations = readdirSync("drizzle")
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    const sql = readFileSync(join("drizzle", file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) await d1.prepare(statement).run();
    }
  }
  return {
    db: dbFor(d1),
    d1,
    dispose: async () => {
      await proxy.dispose();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
