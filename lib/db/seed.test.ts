import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createAuth, type Auth } from "@/lib/auth";
import type { Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { seed, seedPassword, yearId } from "@/lib/db/seed";
import { reports } from "@/lib/reports";
import { testDb } from "@/test/db";

let db: Db;
let auth: Auth;
let dispose: () => Promise<void>;

vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  db: async () => db,
}));

const { reportData } = await import("@/lib/db/queries/reports");

beforeAll(async () => {
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret";
  ({ db, dispose } = await testDb());
  auth = createAuth(db, { schoolName: async () => "Test" });
});
afterAll(() => dispose());

const counts = async () => {
  const n = async (
    table: Parameters<Db["select"]>[0] extends never ? never : (typeof t)[keyof typeof t],
  ) => (await db.select({ n: count() }).from(table as typeof t.users))[0].n;
  return {
    users: await n(t.users),
    teachers: await n(t.teachers),
    guardians: await n(t.guardians),
    students: await n(t.students),
    classes: await n(t.classes),
    assignments: await n(t.teachingAssignments),
    enrolments: await n(t.enrolments),
    periods: await n(t.sessionPeriods),
  };
};

describe("seed", () => {
  // Seeds the whole school twice over a real SQLite file; slower than the 20s default.
  it("creates the demo school and is idempotent", { timeout: 60_000 }, async () => {
    await seed(db, auth);
    const first = await counts();
    expect(first).toEqual({
      users: 1 + 8 + 39 + 54 + 6,
      teachers: 8,
      guardians: 46,
      students: 60,
      classes: 8,
      assignments: 24,
      enrolments: 54,
      periods: 8,
    });
    await seed(db, auth);
    expect(await counts()).toEqual(first);
  });

  it("makes the teacher-parent and the demo logins work", async () => {
    const maryam = await db.query.users.findFirst({
      where: eq(t.users.email, "teacher1@example.com"),
    });
    expect(
      await db.query.teachers.findFirst({ where: eq(t.teachers.userId, maryam!.id) }),
    ).toBeDefined();
    expect(
      await db.query.guardians.findFirst({ where: eq(t.guardians.userId, maryam!.id) }),
    ).toBeDefined();
    const admin = await auth.api.signInEmail({
      body: { email: "admin@example.com", password: seedPassword },
    });
    expect(admin.user.name).toBe("Amina Khan");
    const student = await auth.api.signInUsername({
      body: { username: "ALB-26-0001", password: seedPassword },
    });
    expect(student?.user.email).toBe("alb-26-0001@students.invalid");
  });

  it("leaves six applications pending with no enrolment", async () => {
    const pending = await db.select().from(t.students).where(eq(t.students.status, "applied"));
    expect(pending).toHaveLength(6);
    expect(pending.every((s) => s.studentId === null && s.userId === null)).toBe(true);
  });

  // The reports read the demographics of a real school, so they are counted here rather
  // than only against a fixture: every placed child appears in every report exactly once.
  it("gives the reports a school to count", async () => {
    const data = await reportData(yearId);
    expect(data.children).toHaveLength(54);
    expect(data.sessions).toEqual(["Saturday", "Sunday"]);
    const total = (rows: { count: number }[]) => rows.reduce((sum, r) => sum + r.count, 0);
    const byId = Object.fromEntries(reports(data, "2026-10-03").map((r) => [r.id, r.data]));
    for (const id of ["age", "sessions", "gender", "arabic", "countries", "areas"]) {
      expect(total(byId[id]), id).toBe(54);
    }
    // Multi-valued answers count a child once per answer, so these are at least the total.
    expect(total(byId.languages)).toBeGreaterThan(54);
    expect(total(byId.reasons)).toBeGreaterThan(54);
    expect(byId.countries.every((r) => r.count > 0)).toBe(true);
  });
});
