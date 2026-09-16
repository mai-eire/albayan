import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Logger } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Db = DrizzleD1Database<typeof schema>;

// `logger` is for tests that assert which columns a query touches.
export function dbFor(d1: D1Database, logger?: Logger): Db {
  return drizzle(d1, { schema, casing: "snake_case", logger });
}

// The D1 binding: local SQLite under .wrangler/state in dev, D1 in production.
export async function db(): Promise<Db> {
  const { env } = await getCloudflareContext({ async: true });
  return dbFor(env.DB);
}
