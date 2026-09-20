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
  sessionPeriods,
  students,
  subjects,
  teachers,
  teachingAssignments,
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

const { createClass, moveStudent, updateClass } = await import("./actions");

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
    { id: 3, name: "Maryam", email: "m@example.com" },
    { id: 4, name: "Omar", email: "o@example.com" },
  ]);
  await db.insert(guardians).values({ id: 1, userId: 2 });
  await db.insert(teachers).values([
    { id: 1, userId: 3 },
    { id: 2, userId: 4 },
  ]);
  await db.insert(subjects).values([
    { id: "quran", name: "Quran" },
    { id: "arabic", name: "Arabic" },
  ]);
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

  it("refuses a full class unless the admin says to go over capacity", async () => {
    current = admin;
    // Level 1 is empty now; give it one place and fill it.
    await db.update(classes).set({ capacity: 1 }).where(eq(classes.id, 1));
    await db.insert(students).values({
      id: 2,
      firstName: "Bilal",
      lastName: "B",
      gender: "male",
      dateOfBirth: "2017-01-01",
      status: "active",
      appliedAt: "2026-08-01T00:00:00Z",
      createdByGuardianId: 1,
    });
    await db
      .insert(enrolments)
      .values({ id: 50, studentId: 2, classId: 1, startDate: "2026-09-05", feeCents: 20000 });
    const [amira] = await db
      .select({ id: enrolments.id })
      .from(enrolments)
      .where(eq(enrolments.studentId, 1))
      .orderBy(enrolments.id)
      .limit(1)
      .offset(1);
    expect(await moveStudent({ enrolmentId: amira.id, classId: 1 })).toMatchObject({
      ok: false,
      error: /full \(1 of 1 places\)/,
    });
    expect(
      await moveStudent({ enrolmentId: amira.id, classId: 1, overCapacity: true }),
    ).toMatchObject({ ok: true });
  });
});

describe("createClass and updateClass", () => {
  it("starts a class with its class teacher on every subject, then hands them over", async () => {
    current = admin;
    await db.insert(sessionPeriods).values([
      { sessionId: 1, sortOrder: 1, subjectId: "quran", durationMinutes: 50 },
      { sessionId: 1, sortOrder: 2, title: "Break", durationMinutes: 20 },
      { sessionId: 1, sortOrder: 3, subjectId: "arabic", durationMinutes: 50 },
      { sessionId: 1, sortOrder: 4, subjectId: "quran", durationMinutes: 30 },
    ]);
    const created = await createClass({
      sessionId: 1,
      name: "Level 3",
      room: null,
      capacity: 15,
      classTeacherId: 1,
    });
    if (!created.ok) throw new Error(created.error);
    const classId = created.data.id;
    const taught = () =>
      db
        .select({
          subjectId: teachingAssignments.subjectId,
          teacherId: teachingAssignments.teacherId,
        })
        .from(teachingAssignments)
        .where(eq(teachingAssignments.classId, classId))
        .orderBy(teachingAssignments.subjectId);
    expect(await taught()).toEqual([
      { subjectId: "arabic", teacherId: 1 },
      { subjectId: "quran", teacherId: 1 },
    ]);

    // Arabic goes to Omar by hand; then Omar becomes class teacher and takes over what
    // Maryam still taught.
    await db
      .update(teachingAssignments)
      .set({ teacherId: 2 })
      .where(eq(teachingAssignments.subjectId, "arabic"));
    const base = { id: classId, sessionId: 1, name: "Level 3", room: null, capacity: 15 };
    expect(await updateClass({ ...base, classTeacherId: 2 })).toMatchObject({ ok: true });
    expect(await taught()).toEqual([
      { subjectId: "arabic", teacherId: 2 },
      { subjectId: "quran", teacherId: 1 },
    ]);
    expect(await updateClass({ ...base, classTeacherId: 1 })).toMatchObject({ ok: true });
    expect(await updateClass({ ...base, classTeacherId: 2, handOverSubjects: true })).toMatchObject(
      { ok: true },
    );
    expect(await taught()).toEqual([
      { subjectId: "arabic", teacherId: 2 },
      { subjectId: "quran", teacherId: 2 },
    ]);
  });
});
