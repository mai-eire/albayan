import { eq } from "drizzle-orm";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import type { CurrentUser } from "@/lib/current-user";
import type { Db } from "@/lib/db";
import { auditLog, teachers, users } from "@/lib/db/schema";
import { findInvite } from "@/lib/invites";
import { testDb } from "@/test/db";

let db: Db;
let dispose: () => Promise<void>;
let current: CurrentUser | null = null;
const mailDir = mkdtempSync(join(tmpdir(), "albayan-mail-"));

vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  db: async () => db,
}));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: async () => current }));
vi.mock("@/lib/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/auth")>();
  let instance: ReturnType<typeof mod.createAuth> | undefined;
  return {
    ...mod,
    auth: async () => (instance ??= mod.createAuth(db, { schoolName: async () => "Test" })),
  };
});
vi.mock("@/lib/app-url", () => ({ appUrl: async (p: string) => `http://localhost:3000${p}` }));
vi.mock("@/lib/db/queries/settings", () => ({ getSchoolSettings: async () => ({ name: "Test" }) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { inviteStaff, setAdmin } = await import("./actions");

const base = {
  name: "X",
  email: "x@example.com",
  phone: null,
  emailVerified: true,
  emailNotifications: true,
  mustChangePassword: false,
  guardian: null,
  teacher: null,
  student: null,
};
const admin: CurrentUser = { ...base, id: 1, isAdmin: true, areas: ["admin"] };
const other: CurrentUser = { ...base, id: 2, isAdmin: false, areas: [] };

beforeAll(async () => {
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret";
  process.env.EMAIL_DIR = mailDir;
  ({ db, dispose } = await testDb());
  await db.insert(users).values([
    { id: 1, name: "Admin", email: "a@example.com", isAdmin: true },
    { id: 2, name: "Parent", email: "p@example.com" },
  ]);
});
afterAll(async () => {
  await dispose();
  rmSync(mailDir, { recursive: true, force: true });
});

describe("inviteStaff", () => {
  it("denies non-admins and validates", async () => {
    current = other;
    expect(
      await inviteStaff({ name: "T", email: "t@example.com", teacher: true, admin: false }),
    ).toMatchObject({ ok: false, error: /access/ });
    current = admin;
    expect(
      await inviteStaff({ name: "Tariq", email: "not-an-email", teacher: false, admin: false }),
    ).toMatchObject({
      ok: false,
      fieldErrors: { email: "Enter a valid email address", teacher: "Pick at least one role" },
    });
  });

  it("creates an invited user with a teacher row, emails a working link and audits", async () => {
    current = admin;
    const result = await inviteStaff({
      name: "Tariq Ali",
      email: "Tariq@Example.com",
      teacher: true,
      admin: false,
    });
    expect(result).toEqual({ ok: true, data: { outcome: "invited", name: "Tariq Ali" } });

    const created = await db.query.users.findFirst({
      where: eq(users.email, "tariq@example.com"),
    });
    expect(created).toMatchObject({ status: "invited", isAdmin: false });
    expect(
      await db.query.teachers.findFirst({ where: eq(teachers.userId, created!.id) }),
    ).toBeTruthy();

    const mail = readdirSync(mailDir).find((f) => f.includes("set-up-your"));
    expect(mail).toBeTruthy();
    const token = readFileSync(join(mailDir, mail!), "utf8").match(/\/invite\/([a-f0-9]+)/)?.[1];
    expect(token).toBeTruthy();
    expect(await findInvite(await auth(), db, token!)).toMatchObject({
      email: "tariq@example.com",
    });

    const entries = await db.select().from(auditLog);
    expect(entries.at(-1)).toMatchObject({ action: "staff.invite", entityId: String(created!.id) });
  });

  it("adds the role to an existing account without emailing", async () => {
    current = admin;
    const before = readdirSync(mailDir).length;
    expect(
      await inviteStaff({ name: "Ignored", email: "p@example.com", teacher: true, admin: false }),
    ).toEqual({ ok: true, data: { outcome: "added", name: "Parent" } });
    expect(await db.select().from(teachers).where(eq(teachers.userId, 2))).toHaveLength(1);
    expect(readdirSync(mailDir).length).toBe(before);
    expect(
      await inviteStaff({ name: "Ignored", email: "p@example.com", teacher: true, admin: false }),
    ).toMatchObject({ ok: false, error: /already a teacher/ });
  });
});

describe("setAdmin", () => {
  it("never lets an admin revoke themselves", async () => {
    current = admin;
    expect(await setAdmin({ userId: 1, isAdmin: false })).toMatchObject({
      ok: false,
      error: /your own/,
    });
    expect(await setAdmin({ userId: 2, isAdmin: true })).toEqual({ ok: true, data: undefined });
    expect((await db.query.users.findFirst({ where: eq(users.id, 2) }))?.isAdmin).toBe(true);
  });
});
