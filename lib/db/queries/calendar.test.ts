import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { dbFor, type Db } from "@/lib/db";
import {
  academicYears,
  classes,
  enrolments,
  guardians,
  schoolSessions,
  sessionPeriods,
  studentGuardians,
  students,
  subjects,
  users,
} from "@/lib/db/schema";
import { testDb } from "@/test/db";

let db: Db;
let dispose: () => Promise<void>;

vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  db: async () => db,
}));

const { lessonDaysForStudents } = await import("./calendar");

beforeAll(async () => {
  const fresh = await testDb();
  dispose = fresh.dispose;
  db = dbFor(fresh.d1);
  await db.insert(users).values({ id: 1, name: "Maryam Parent", email: "maryam@example.com" });
  await db.insert(guardians).values({ id: 1, userId: 1 });
  await db.insert(academicYears).values({
    id: "2026-27",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    standardFeeCents: 25000,
    isCurrent: true,
  });
  await db.insert(schoolSessions).values([
    { id: 1, academicYearId: "2026-27", name: "Saturday", dayOfWeek: 6, startTime: "10:00" },
    { id: 2, academicYearId: "2026-27", name: "Sunday", dayOfWeek: 0, startTime: "11:00" },
  ]);
  await db.insert(subjects).values({ id: "quran", name: "Quran" });
  await db.insert(sessionPeriods).values([
    { sessionId: 1, sortOrder: 0, title: "Staff briefing", durationMinutes: 15, staffOnly: true },
    { sessionId: 1, sortOrder: 1, subjectId: "quran", durationMinutes: 50 },
    { sessionId: 2, sortOrder: 0, subjectId: "quran", durationMinutes: 60 },
  ]);
  await db.insert(classes).values([
    { id: 1, academicYearId: "2026-27", sessionId: 1, name: "Level 1" },
    { id: 2, academicYearId: "2026-27", sessionId: 1, name: "Level 3" },
    { id: 3, academicYearId: "2026-27", sessionId: 2, name: "Level 2" },
  ]);
  await db.insert(students).values(
    [
      { id: 1, firstName: "Amira", classId: 1 },
      { id: 2, firstName: "Yusuf", classId: 2 },
      { id: 3, firstName: "Zayd", classId: 3 },
    ].map(({ id, firstName }) => ({
      id,
      firstName,
      lastName: "Ahmed",
      gender: "female" as const,
      dateOfBirth: "2018-05-17",
      status: "active" as const,
      appliedAt: "2026-08-20T10:00:00.000Z",
      createdByGuardianId: 1,
    })),
  );
  await db.insert(studentGuardians).values(
    [1, 2, 3].map((studentId) => ({
      studentId,
      guardianId: 1,
      relationship: "mother" as const,
      isPrimaryContact: studentId === 1,
    })),
  );
  await db.insert(enrolments).values([
    { studentId: 1, classId: 1, startDate: "2026-09-05", feeCents: 25000 },
    { studentId: 2, classId: 2, startDate: "2026-09-05", feeCents: 20000 },
    { studentId: 3, classId: 3, startDate: "2026-09-05", feeCents: 20000 },
  ]);
});
afterAll(() => dispose());

describe("lessonDaysForStudents", () => {
  it("gives one entry per session, naming the children who are in it", async () => {
    const days = await lessonDaysForStudents([
      { id: 1, firstName: "Amira" },
      { id: 2, firstName: "Yusuf" },
      { id: 3, firstName: "Zayd" },
    ]);
    expect(days).toEqual([
      // Siblings in different classes of one session share the day: one chip, both names.
      {
        sessionId: 1,
        dayOfWeek: 6,
        label: "Amira & Yusuf: Saturday",
        // The staff briefing before they arrive is not their morning.
        startTime: "10:15",
        endTime: "11:05",
      },
      { sessionId: 2, dayOfWeek: 0, label: "Zayd: Sunday", startTime: "11:00", endTime: "12:00" },
    ]);
    // What the calendar keys chips by has to tell them apart.
    expect(new Set(days.map((d) => `${d.sessionId}-${d.label}`)).size).toBe(days.length);
  });

  it("leaves the name off when there is only one child", async () => {
    const days = await lessonDaysForStudents([{ id: 3, firstName: "Zayd" }]);
    expect(days.map((d) => d.label)).toEqual(["Sunday class"]);
  });

  it("has nothing to show for a family with no children yet", async () => {
    expect(await lessonDaysForStudents([])).toEqual([]);
  });
});
