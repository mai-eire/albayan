import { eq } from "drizzle-orm";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import type { CurrentUser } from "@/lib/current-user";
import type { Db } from "@/lib/db";
import {
  auditLog,
  guardians,
  notifications,
  studentGuardians,
  students,
  users,
} from "@/lib/db/schema";
import { acceptInvite } from "@/lib/invites";
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
vi.mock("next/server", () => ({ after: (work: () => Promise<void>) => void work() }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { addParent } = await import("./actions");

const mother: CurrentUser = {
  id: 2,
  name: "Maryam",
  email: "m@example.com",
  phone: null,
  isAdmin: false,
  emailVerified: true,
  emailNotifications: true,
  mustChangePassword: false,
  guardian: { id: 1 },
  teacher: null,
  student: null,
  areas: ["family"],
};

const child = (id: number, firstName: string, createdByGuardianId: number) => ({
  id,
  firstName,
  lastName: "Ahmed",
  gender: "female" as const,
  dateOfBirth: "2018-01-01",
  status: "active" as const,
  appliedAt: "2026-08-01T00:00:00Z",
  createdByGuardianId,
});

beforeAll(async () => {
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret";
  process.env.EMAIL_DIR = mailDir;
  ({ db, dispose } = await testDb());
  await db.insert(users).values([
    { id: 1, name: "Admin", email: "a@example.com", isAdmin: true },
    { id: 2, name: "Maryam", email: "m@example.com" },
    { id: 3, name: "Other parent", email: "o@example.com" },
  ]);
  await db.insert(guardians).values([
    { id: 1, userId: 2, gender: "female" },
    { id: 2, userId: 3 },
  ]);
  await db
    .insert(students)
    .values([child(1, "Amira", 1), child(2, "Zainab", 1), child(3, "Nobody", 2)]);
  await db.insert(studentGuardians).values([
    { studentId: 1, guardianId: 1, relationship: "mother", isPrimaryContact: true },
    { studentId: 2, guardianId: 1, relationship: "mother", isPrimaryContact: true },
    { studentId: 3, guardianId: 2, relationship: "father", isPrimaryContact: true },
  ]);
});
afterAll(async () => {
  await dispose();
  rmSync(mailDir, { recursive: true, force: true });
});

const input = {
  name: "Yusuf Ahmed",
  email: "Yusuf@Example.com",
  phone: null,
  gender: "male" as const,
  relationship: "father" as const,
};

describe("addParent", () => {
  it("only links my own children and never myself", async () => {
    current = mother;
    expect(await addParent({ ...input, studentIds: [1, 3] })).toMatchObject({
      ok: false,
      error: /own children/,
    });
    expect(await addParent({ ...input, email: "m@example.com", studentIds: [1] })).toMatchObject({
      ok: false,
      error: /own email/,
    });
  });

  it("invites a new parent to the ticked children; the link signs them in to those alone", async () => {
    current = mother;
    expect(await addParent({ ...input, studentIds: [1] })).toMatchObject({
      ok: true,
      data: { outcome: "invited", name: "Yusuf Ahmed" },
    });
    const created = await db.query.users.findFirst({ where: eq(users.email, "yusuf@example.com") });
    expect(created).toMatchObject({ status: "invited" });
    const guardian = await db.query.guardians.findFirst({
      where: eq(guardians.userId, created!.id),
    });
    expect(guardian).toMatchObject({ gender: "male" });
    const links = await db
      .select({
        studentId: studentGuardians.studentId,
        relationship: studentGuardians.relationship,
      })
      .from(studentGuardians)
      .where(eq(studentGuardians.guardianId, guardian!.id));
    expect(links).toEqual([{ studentId: 1, relationship: "father" }]);

    const mail = readdirSync(mailDir).find((f) => f.includes("added-you-as-a-parent"));
    expect(mail).toBeTruthy();
    const text = readFileSync(join(mailDir, mail!), "utf8");
    expect(text).toContain("Amira");
    expect(text).not.toContain("Zainab");
    const token = text.match(/\/invite\/([a-f0-9]+)/)?.[1];
    expect(await acceptInvite(await auth(), db, token!, "a fine password")).toMatchObject({
      email: "yusuf@example.com",
    });
    expect((await db.select().from(auditLog)).at(-1)).toMatchObject({ action: "guardian.add" });
  });

  it("adds more children to someone who already has an account and tells them", async () => {
    current = mother;
    expect(await addParent({ ...input, studentIds: [1, 2] })).toMatchObject({
      ok: true,
      data: { outcome: "linked" },
    });
    const yusuf = await db.query.users.findFirst({ where: eq(users.email, "yusuf@example.com") });
    const links = await db
      .select({ studentId: studentGuardians.studentId })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(eq(guardians.userId, yusuf!.id));
    expect(links.map((l) => l.studentId).sort()).toEqual([1, 2]);
    expect(
      await db.select().from(notifications).where(eq(notifications.userId, yusuf!.id)),
    ).toEqual([expect.objectContaining({ type: "guardian.added" })]);
    expect(await addParent({ ...input, studentIds: [1, 2] })).toMatchObject({
      ok: false,
      error: /already a guardian/,
    });
  });
});
