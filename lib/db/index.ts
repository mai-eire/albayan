import type { Logger } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "./schema";
import { bindings } from "../cloudflare";
import { httpDb } from "./http";

// Wide enough for both drivers: the D1 binding on Workers, sqlite-proxy over D1's HTTP API
// on Netlify. They differ only in what `.run()` reports, which nothing here reads.
export type Db = BaseSQLiteDatabase<"async", unknown, typeof schema>;

// `logger` is for tests that assert which columns a query touches.
export function dbFor(d1: D1Database, logger?: Logger): Db {
  return drizzle(d1, { schema, casing: "snake_case", logger });
}

// One HTTP client for the isolate; the binding path is cheap enough to build per call.
let overHttp: Db | undefined;

// The D1 binding: local SQLite under .wrangler/state in dev, D1 in production. With no
// binding (Netlify) the same database is reached over HTTP instead.
export async function db(): Promise<Db> {
  const env = await bindings();
  if (env) return dbFor(env.DB);
  return (overHttp ??= httpDb());
}
