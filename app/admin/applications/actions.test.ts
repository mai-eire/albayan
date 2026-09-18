import { eq } from "drizzle-orm";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import type { CurrentUser } from "@/lib/current-user";
import type { Db } from "@/lib/db";
import { auditLog, enrolments, notifications, students } from "@/lib/db/schema";
import { seed } from "@/lib/db/seed";
import { nextStudentId } from "@/lib/student-ids";
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
vi.mock("@/lib/db/queries/settings", () => ({
  getSchoolSettings: async () => ({
    name: "Test",
    timezone: "Europe/Dublin",
    studentIdPrefix: "ALB",
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { approveApplication, declineApplication } = await import("./actions");

const admin: CurrentUser = {
  id: 1,
  name: "Admin",
  email: "admin@example.com",
  isAdmin: true,
  phone: null,
  emailVerified: true,
  emailNotifications: true,
  mustChangePassword: false,
  guardian: null,
  teacher: null,
  student: null,
  areas: ["admin"],
};

beforeAll(async () => {
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret";
  process.env.EMAIL_DIR = mailDir;
  ({ db, dispose } = await testDb());
  await seed(db, await auth());
});
afterAll(async () => {
  await dispose();
  rmSync(mailDir, { recursive: true, force: true });
});

describe("approveApplication", () => {
  it("places the child, creates their sign-in, emails the guardian and audits", async () => {
    current = admin;
    const pending = await db.query.students.findMany({ where: eq(students.status, "applied") });
    expect(pending.length).toBeGreaterThan(1);
    const [first, second] = pending;
    const expectedId = await nextStudentId(db, "ALB", "2026-27");
    expect(expectedId).toBe("ALB-26-0055");

    const result = await approveApplication({
      id: first.id,
      classId: 1,
      fee: "200",
      feeNote: "Sibling discount",
      offerNote: "Level 1 suits their Arabic best this year.",
    });
    expect(result).toEqual({ ok: true, data: { studentId: "ALB-26-0055" } });

    const placed = await db.query.students.findFirst({ where: eq(students.id, first.id) });
    expect(placed).toMatchObject({
      status: "active",
      studentId: "ALB-26-0055",
      offerNote: "Level 1 suits their Arabic best this year.",
    });
    expect(placed?.userId).toBeTruthy();
    expect(placed?.approvedAt).toBeTruthy();
    const [enrolment] = await db
      .select()
      .from(enrolments)
      .where(eq(enrolments.studentId, first.id));
    expect(enrolment).toMatchObject({
      classId: 1,
      feeCents: 20000,
      feeNote: "Sibling discount",
      status: "active",
    });

    const mail = readdirSync(mailDir).find((f) => f.includes("has-a-place"));
    expect(mail).toBeTruthy();
    const html = readFileSync(join(mailDir, mail!), "utf8");
    expect(html).toContain("ALB-26-0055");
    expect(html).toContain("Level 1 suits their Arabic best this year.");
    const password = html.match(/first password is <strong>([a-z0-9]+)<\/strong>/)?.[1];
    expect(password).toBeTruthy();

    // The student can sign in with the emailed password and must change it.
    const signedIn = await (
      await auth()
    ).api.signInUsername({
      body: { username: "ALB-26-0055", password: password! },
    });
    expect(signedIn?.user).toMatchObject({ mustChangePassword: true });

    expect(await nextStudentId(db, "ALB", "2026-27")).toBe("ALB-26-0056");
    expect(await approveApplication({ id: second.id, classId: 2, fee: "250" })).toEqual({
      ok: true,
      data: { studentId: "ALB-26-0056" },
    });
    expect(await approveApplication({ id: first.id, classId: 1, fee: "250" })).toMatchObject({
      ok: false,
      error: /already been dealt with/,
    });
    const entries = await db.select().from(auditLog).where(eq(auditLog.action, "student.approve"));
    expect(entries).toHaveLength(2);
    expect(await db.select().from(notifications)).toEqual([
      expect.objectContaining({
        type: "application.approved",
        href: `/family/${first.id}`,
        readAt: null,
      }),
      expect.objectContaining({ type: "application.approved" }),
    ]);
  });

  it("refuses non-admins and validates the fee", async () => {
    current = { ...admin, isAdmin: false, areas: [] };
    const [pending] = await db.query.students.findMany({ where: eq(students.status, "applied") });
    expect(await approveApplication({ id: pending.id, classId: 1, fee: "250" })).toMatchObject({
      ok: false,
      error: /access/,
    });
    current = admin;
    expect(await approveApplication({ id: pending.id, classId: 1, fee: "lots" })).toMatchObject({
      ok: false,
      fieldErrors: { fee: "Enter an amount like 250 or 250.50" },
    });
  });
});

describe("declineApplication", () => {
  it("records the reason and emails the guardian", async () => {
    current = admin;
    const [pending] = await db.query.students.findMany({ where: eq(students.status, "applied") });
    expect(await declineApplication({ id: pending.id, reason: "short" })).toMatchObject({
      ok: false,
      fieldErrors: { reason: "Give the family a reason" },
    });
    const reason = "We're full for this year; we'll contact you if a place opens up.";
    expect(await declineApplication({ id: pending.id, reason })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(await db.query.students.findFirst({ where: eq(students.id, pending.id) })).toMatchObject(
      {
        status: "declined",
        declinedReason: reason,
        applicationNotes: "Would prefer to be with their cousin if possible.",
      },
    );
    const mail = readdirSync(mailDir).find((f) => f.includes("about-"));
    expect(mail).toBeTruthy();
    expect(readFileSync(join(mailDir, mail!), "utf8")).toContain("We&#x27;re full");
  });
});
