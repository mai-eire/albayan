import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { testDb } from "@/test/db";
import { countUnread, notify } from "./notify";

// No request scope in tests: after() throws and notify falls back to running the email.
vi.mock("next/server", () => ({
  after: () => {
    throw new Error("after() called outside a request");
  },
}));

let db: Db;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  await db.insert(users).values([
    { id: 1, name: "Wants email", email: "a@example.com" },
    { id: 2, name: "In-app only", email: "b@example.com", emailNotifications: false },
    { id: 3, name: "Disabled", email: "c@example.com", status: "disabled" },
  ]);
});
afterAll(() => dispose());

describe("notify", () => {
  it("always writes the row and emails only when the person allows it", async () => {
    const sent: number[] = [];
    for (const userId of [1, 2, 3]) {
      await notify(db, {
        userId,
        type: "test",
        title: "Hello",
        href: "/family",
        email: async () => {
          sent.push(userId);
        },
      });
    }
    await new Promise((r) => setTimeout(r, 10));
    expect(sent).toEqual([1]);
    expect(await db.select().from(notifications)).toHaveLength(3);
    expect(await countUnread(db, 2)).toBe(1);
  });

  it("counts only unread rows", async () => {
    await db.update(notifications).set({ readAt: new Date().toISOString() });
    expect(await countUnread(db, 1)).toBe(0);
  });
});
