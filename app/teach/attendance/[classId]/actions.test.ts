import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/current-user";
import type { Db } from "@/lib/db";
import {
  academicYears,
  attendance,
  auditLog,
  classes,
  enrolments,
  guardians,
  notifications,
  schoolSessions,
  studentGuardians,
  students,
  teachers,
  users,
} from "@/lib/db/schema";
import { testDb } from "@/test/db";

let db: Db;
let dispose: () => Promise<void>;
let current: CurrentUser | null = null;
let absenceEmails = false;
const emails: string[] = [];

vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  db: async () => db,
}));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: async () => current }));
vi.mock("@/lib/db/queries/settings", () => ({
  getSchoolSettings: async () => ({ name: "Test", timezone: "UTC", absenceEmails }),
}));
vi.mock("@/lib/email", () => ({
  sendAbsence: async (to: { email: string }) => {
    emails.push(to.email);
  },
}));
vi.mock("next/server", () => ({ after: (work: () => Promise<void>) => void work() }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { saveRegister } = await import("./actions");

const base = {
  name: "X",
  email: "x@example.com",
  phone: null,
  isAdmin: false,
  emailVerified: true,
  emailNotifications: true,
  mustChangePassword: false,
  guardian: null,
  student: null,
};
const teacher: CurrentUser = {
  ...base,
  id: 2,
  teacher: { id: 1, isActive: true },
  areas: ["teach"],
};
const other: CurrentUser = { ...base, id: 3, teacher: { id: 2, isActive: true }, areas: ["teach"] };
const admin: CurrentUser = { ...base, id: 1, isAdmin: true, teacher: null, areas: ["admin"] };

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  await db.insert(users).values([
    { id: 1, name: "Admin", email: "a@example.com", isAdmin: true },
    { id: 2, name: "Teacher", email: "t@example.com" },
    { id: 3, name: "Other", email: "o@example.com" },
    { id: 4, name: "Parent", email: "p@example.com" },
  ]);
  await db.insert(teachers).values([
    { id: 1, userId: 2 },
    { id: 2, userId: 3 },
  ]);
  await db.insert(guardians).values({ id: 1, userId: 4 });
  await db
    .insert(academicYears)
    .values({ id: "2026-27", startDate: "2026-09-01", endDate: "2027-06-30", isCurrent: true });
  await db.insert(schoolSessions).values({
    id: 1,
    academicYearId: "2026-27",
    name: "Saturday",
    dayOfWeek: 6,
    startTime: "10:00",
  });
  await db
    .insert(classes)
    .values({ id: 1, academicYearId: "2026-27", sessionId: 1, name: "Level 1", classTeacherId: 1 });
  await db.insert(students).values([
    {
      id: 1,
      firstName: "Amira",
      lastName: "A",
      gender: "female",
      dateOfBirth: "2018-01-01",
      status: "active",
      appliedAt: "2026-08-01T00:00:00Z",
      createdByGuardianId: 1,
    },
    {
      id: 2,
      firstName: "Zayd",
      lastName: "A",
      gender: "male",
      dateOfBirth: "2019-01-01",
      status: "active",
      appliedAt: "2026-08-01T00:00:00Z",
      createdByGuardianId: 1,
    },
  ]);
  await db.insert(studentGuardians).values([
    { studentId: 1, guardianId: 1, relationship: "mother", isPrimaryContact: true },
    { studentId: 2, guardianId: 1, relationship: "mother", isPrimaryContact: true },
  ]);
  await db.insert(enrolments).values([
    { studentId: 1, classId: 1, startDate: "2026-09-05", feeCents: 0 },
    { studentId: 2, classId: 1, startDate: "2026-09-05", feeCents: 0 },
  ]);
});
afterAll(() => dispose());

const all = (status: "present" | "absent" = "present") => [
  { studentId: 1, status, note: "" },
  { studentId: 2, status: "present" as const, note: "" },
];

describe("saveRegister", () => {
  it("only the class's teachers can take today's register", async () => {
    current = other;
    expect(await saveRegister({ classId: 1, date: today, entries: all() })).toMatchObject({
      ok: false,
      error: /access/,
    });
    current = teacher;
    expect(await saveRegister({ classId: 1, date: today, entries: all() })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(await db.select().from(attendance)).toHaveLength(2);
    expect(await db.select().from(notifications)).toHaveLength(0);
  });

  it("a second save is an edit; new absences notify the guardian, email only when enabled", async () => {
    current = teacher;
    expect(await saveRegister({ classId: 1, date: today, entries: all("absent") })).toMatchObject({
      ok: true,
    });
    expect(await db.select().from(attendance).where(eq(attendance.studentId, 1))).toEqual([
      expect.objectContaining({ status: "absent", date: today }),
    ]);
    expect(await db.select().from(notifications)).toEqual([
      expect.objectContaining({ userId: 4, type: "attendance.absent", href: "/family/1" }),
    ]);
    expect(emails).toEqual([]);
    // Same-day edits are not audited.
    expect(await db.select().from(auditLog)).toHaveLength(0);

    absenceEmails = true;
    await saveRegister({ classId: 1, date: today, entries: all() });
    await saveRegister({ classId: 1, date: today, entries: all("absent") });
    expect(emails).toEqual(["p@example.com"]);
  });

  it("past registers can be filled in by the teacher and are audited with before/after", async () => {
    current = teacher;
    expect(await saveRegister({ classId: 1, date: yesterday, entries: all() })).toMatchObject({
      ok: true,
    });
    current = admin;
    expect(
      await saveRegister({
        classId: 1,
        date: yesterday,
        entries: [{ studentId: 2, status: "late", note: "Bus" }],
      }),
    ).toMatchObject({ ok: true });
    expect(await db.select().from(auditLog)).toEqual([
      expect.objectContaining({
        action: "attendance.edit",
        changes: { "1": [null, "present"], "2": [null, "present"] },
      }),
      expect.objectContaining({
        action: "attendance.edit",
        entityId: `1:${yesterday}`,
        changes: { "2": ["present", "late (Bus)"] },
      }),
    ]);
    expect(await saveRegister({ classId: 1, date: "2999-01-01", entries: all() })).toMatchObject({
      ok: false,
      error: /future/,
    });
  });
});
