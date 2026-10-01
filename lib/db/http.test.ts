import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { httpDb } from "./http";
import { accounts } from "./schema";

// Nothing else exercises this transport: every other test, and the whole Worker, use the
// D1 binding. It is where a bug can only be found in production, so the two things that
// went wrong there are pinned here instead.
describe("D1 over HTTP", () => {
  beforeAll(() => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
    process.env.CLOUDFLARE_DATABASE_ID = "test-database";
    process.env.CLOUDFLARE_D1_TOKEN = "test-token";
  });
  afterEach(() => vi.unstubAllGlobals());

  function captureSql(rows: unknown[][] = []) {
    const sent: string[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)).sql);
      return new Response(
        JSON.stringify({ success: true, result: [{ results: { columns: [], rows } }] }),
      );
    });
    return sent;
  }

  // No column in this schema declares a name; they are all derived from `casing`. Drizzle
  // reads it off `drizzle`'s third argument, so the documented two-argument form drops it
  // and asks D1 for "userId", which is not a column anywhere.
  it("asks for snake_case columns", async () => {
    const sent = captureSql();
    await httpDb().select().from(accounts).where(eq(accounts.userId, 1));
    expect(sent[0]).toContain('"user_id"');
    expect(sent[0]).not.toContain('"userId"');
  });

  // A truthy value is a row as far as drizzle is concerned, so returning [] for a miss
  // turns `findFirst` into an object of undefined fields rather than null.
  it("returns null for a row that is not there", async () => {
    captureSql([]);
    await expect(httpDb().query.accounts.findFirst()).resolves.toBeUndefined();
  });
});
