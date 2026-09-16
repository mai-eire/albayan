import { eq } from "drizzle-orm";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuth, type Auth } from "./auth";
import type { Db } from "./db";
import { users } from "./db/schema";
import { testDb } from "@/test/db";

let db: Db;
let auth: Auth;
let dispose: () => Promise<void>;
const mailDir = mkdtempSync(join(tmpdir(), "albayan-mail-"));

beforeAll(async () => {
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret";
  process.env.EMAIL_DIR = mailDir;
  ({ db, dispose } = await testDb());
  auth = createAuth(db, { schoolName: async () => "Test School" });
});

afterAll(async () => {
  await dispose();
  rmSync(mailDir, { recursive: true, force: true });
});

describe("auth", () => {
  it("signs a user up with an integer id and no privileges", async () => {
    const result = await auth.api.signUpEmail({
      body: { email: "maryam@example.com", password: "correct horse", name: "Maryam Ahmed" },
    });
    expect(result.user.id).toBe("1");
    const [row] = await db.select().from(users).where(eq(users.email, "maryam@example.com"));
    expect(row.id).toBe(1);
    expect(row.isAdmin).toBe(false);
    expect(row.status).toBe("active");
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it("signs in with email and password", async () => {
    const result = await auth.api.signInEmail({
      body: { email: "maryam@example.com", password: "correct horse" },
    });
    expect(result.user.email).toBe("maryam@example.com");
    expect(result.token).toBeTruthy();
  });

  it("rejects a wrong password", async () => {
    await expect(
      auth.api.signInEmail({ body: { email: "maryam@example.com", password: "wrong" } }),
    ).rejects.toThrow();
  });

  it("signs a student in with their student ID as username", async () => {
    await auth.api.signUpEmail({
      body: {
        email: "alb-26-0042@students.invalid",
        password: "first login",
        name: "Yusuf Ahmed",
        username: "alb-26-0042",
      },
    });
    const result = await auth.api.signInUsername({
      body: { username: "ALB-26-0042", password: "first login" },
    });
    expect(result?.user.name).toBe("Yusuf Ahmed");
  });

  it("resets a password through the emailed link", async () => {
    await auth.api.requestPasswordReset({
      body: { email: "maryam@example.com", redirectTo: "/reset-password" },
    });
    const [file] = readdirSync(mailDir).filter((f) => f.includes("reset-your-password"));
    expect(file).toBeDefined();
    const html = readFileSync(join(mailDir, file), "utf8");
    const token = html.match(/reset-password\/([A-Za-z0-9_-]+)/)?.[1];
    expect(token).toBeTruthy();
    await auth.api.resetPassword({ body: { token: token!, newPassword: "new password 1" } });
    const result = await auth.api.signInEmail({
      body: { email: "maryam@example.com", password: "new password 1" },
    });
    expect(result.user.id).toBe("1");
  });
});
