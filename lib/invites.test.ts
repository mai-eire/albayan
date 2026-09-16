import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuth, type Auth } from "./auth";
import type { Db } from "./db";
import { users } from "./db/schema";
import { acceptInvite, createInvite, findInvite } from "./invites";
import { testDb } from "@/test/db";

let db: Db;
let auth: Auth;
let dispose: () => Promise<void>;

beforeAll(async () => {
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret";
  ({ db, dispose } = await testDb());
  auth = createAuth(db, { schoolName: async () => "Test School" });
});

afterAll(() => dispose());

describe("invites", () => {
  it("lets an invited user set a password once, then signs in", async () => {
    const [user] = await db
      .insert(users)
      .values({ name: "Omar Teacher", email: "omar@example.com", status: "invited" })
      .returning();
    const token = await createInvite(auth, user.id);

    expect(await findInvite(auth, db, token)).toMatchObject({
      email: "omar@example.com",
      status: "invited",
    });
    expect(await findInvite(auth, db, "nope")).toBeNull();

    const accepted = await acceptInvite(auth, db, token, "a fine password");
    expect(accepted?.id).toBe(user.id);
    expect(await findInvite(auth, db, token)).toBeNull();
    expect(await acceptInvite(auth, db, token, "again")).toBeNull();

    const result = await auth.api.signInEmail({
      body: { email: "omar@example.com", password: "a fine password" },
    });
    expect(result.user.name).toBe("Omar Teacher");
  });
});
