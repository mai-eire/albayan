import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/current-user";
import type { Db } from "@/lib/db";
import {
  academicYears,
  auditLog,
  classes,
  enrolments,
  guardians,
  schoolSessions,
  students,
  users,
} from "@/lib/db/schema";
import { testDb } from "@/test/db";

let db: Db;
let dispose: () => Promise<void>;
let current: CurrentUser | null = null;

vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  db: async () => db,
}));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: async () => current }));
vi.mock("@/lib/db/queries/settings", () => ({
  getSchoolSettings: async () => ({ timezone: "UTC" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { moveStudent } = await import("./actions");

const admin: CurrentUser = {
  id: 1,
  name: "Admin",
  email: "a@example.com",
  phone: null,
  isAdmin: true,
  emailVerified: true,
  emailNotifications: true,
  mustChangePassword: false,
  guardian: null,
  teacher: null,
  student: null,
  areas: ["admin"],
};

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  await db.insert(users).values([
    { id: 1, name: "Admin", email: "a@example.com", isAdmin: true },
    { id: 2, name: "Parent", email: "p@example.com" },
  ]);
  await db.insert(guardians).values({ id: 1, userId: 2 });
  await db.insert(academicYears).values([
    { id: "2026-27", startDate: "2026-09-01", endDate: "2027-06-30", isCurrent: true },
    { id: "2027-28", startDate: "2027-09-01", endDate: "2028-06-30" },
  ]);
  await db.insert(schoolSessions).values([
    { id: 1, academicYearId: "2026-27", name: "Saturday", dayOfWeek: 6, startTime: "10:00" },
    { id: 2, academicYearId: "2027-28", name: "Saturday", dayOfWeek: 6, startTime: "10:00" },
  ]);
  await db.insert(classes).values([
    { id: 1, academicYearId: "2026-27", sessionId: 1, name: "Level 1" },
    { id: 2, academicYearId: "2026-27", sessionId: 1, name: "Level 2" },
    { id: 3, academicYearId: "2027-28", sessionId: 2, name: "Next year" },
  ]);
  await db.insert(students).values({
    id: 1,
    firstName: "Amira",
    lastName: "A",
    gender: "female",
    dateOfBirth: "2018-01-01",
    status: "active",
    appliedAt: "2026-08-01T00:00:00Z",
    createdByGuardianId: 1,
  });
  await db.insert(enrolments).values({
    id: 10,
    studentId: 1,
    classId: 1,
    startDate: "2026-09-05",
    feeCents: 20000,
    feeNote: "Sibling discount",
  });
});
afterAll(() => dispose());

describe("moveStudent", () => {
  it("ends the old place, starts a new one with the same fee, and audits", async () => {
    current = { ...admin, isAdmin: false, areas: [] };
    expect(await moveStudent({ enrolmentId: 10, classId: 2 })).toMatchObject({
      ok: false,
      error: /access/,
    });
    current = admin;
    expect(await moveStudent({ enrolmentId: 10, classId: 3 })).toMatchObject({
      ok: false,
      error: /same year/,
    });
    expect(await moveStudent({ enrolmentId: 10, classId: 1 })).toMatchObject({
      ok: false,
      error: /already/,
    });
    expect(await moveStudent({ enrolmentId: 10, classId: 2 })).toEqual({
      ok: true,
      data: undefined,
    });

    const rows = await db
      .select()
      .from(enrolments)
      .where(eq(enrolments.studentId, 1))
      .orderBy(enrolments.id);
    expect(rows).toEqual([
      expect.objectContaining({ id: 10, classId: 1, status: "left", endDate: expect.any(String) }),
      expect.objectContaining({
        classId: 2,
        status: "active",
        feeCents: 20000,
        feeNote: "Sibling discount",
        endDate: null,
      }),
    ]);
    expect(await db.select().from(auditLog)).toEqual([
      expect.objectContaining({
        action: "enrolment.move",
        entityId: "1",
        changes: { classId: [1, 2], enrolmentId: [10, rows[1].id] },
      }),
    ]);
    // The old enrolment can't be moved again.
    expect(await moveStudent({ enrolmentId: 10, classId: 1 })).toMatchObject({
      ok: false,
      error: /no longer/,
    });
  });
});
