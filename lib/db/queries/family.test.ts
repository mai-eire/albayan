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
  teachers,
  teachingAssignments,
  users,
} from "@/lib/db/schema";
import { testDb } from "@/test/db";

let db: Db;
let dispose: () => Promise<void>;
const statements: string[] = [];

vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  db: async () => db,
}));

const { getStudentForGuardian, getStudentForStudent } = await import("./family");

beforeAll(async () => {
  const fresh = await testDb();
  dispose = fresh.dispose;
  db = dbFor(fresh.d1, { logQuery: (query) => statements.push(query) });
  await db.insert(users).values([
    { id: 1, name: "Maryam Parent", email: "SECRET-EMAIL@example.com" },
    { id: 2, name: "Omar Teacher", email: "omar@example.com" },
  ]);
  await db.insert(guardians).values({ id: 1, userId: 1, ethnicity: "SECRET-ETHNICITY" });
  await db.insert(teachers).values({ id: 1, userId: 2 });
  await db.insert(academicYears).values({
    id: "2026-27",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    standardFeeCents: 25000,
    isCurrent: true,
  });
  await db.insert(schoolSessions).values({
    id: 1,
    academicYearId: "2026-27",
    name: "Saturday",
    dayOfWeek: 6,
    startTime: "10:00",
  });
  await db.insert(subjects).values([
    { id: "quran", name: "Quran" },
    { id: "arabic", name: "Arabic" },
  ]);
  await db.insert(sessionPeriods).values([
    { sessionId: 1, sortOrder: 0, subjectId: "quran", durationMinutes: 50 },
    { sessionId: 1, sortOrder: 1, title: "Break", durationMinutes: 10 },
    { sessionId: 1, sortOrder: 2, subjectId: "arabic", durationMinutes: 50 },
  ]);
  await db.insert(classes).values({
    id: 1,
    academicYearId: "2026-27",
    sessionId: 1,
    name: "Level 1",
    room: "Room 1",
    classTeacherId: 1,
  });
  await db.insert(teachingAssignments).values({ classId: 1, subjectId: "quran", teacherId: 1 });
  await db.insert(students).values([
    {
      id: 1,
      firstName: "Amira",
      lastName: "Ahmed",
      gender: "female",
      dateOfBirth: "2018-05-17",
      ethnicity: "SECRET-ETHNICITY",
      allergies: "Penicillin",
      status: "active",
      appliedAt: "2026-08-20T10:00:00.000Z",
      createdByGuardianId: 1,
    },
    {
      id: 2,
      firstName: "Zayd",
      lastName: "Ahmed",
      gender: "male",
      dateOfBirth: "2020-01-01",
      status: "applied",
      preferredSessionId: 1,
      appliedAt: "2026-09-10T10:00:00.000Z",
      createdByGuardianId: 1,
    },
  ]);
  await db.insert(studentGuardians).values([
    { studentId: 1, guardianId: 1, relationship: "mother", isPrimaryContact: true },
    { studentId: 2, guardianId: 1, relationship: "mother", isPrimaryContact: true },
  ]);
  await db.insert(enrolments).values({
    studentId: 1,
    classId: 1,
    startDate: "2026-09-05",
    feeCents: 20000,
    feeNote: "Sibling discount",
  });
  statements.length = 0;
});
afterAll(() => dispose());

describe("family queries", () => {
  it("getStudentForGuardian: health, fee and the day's timetable with teachers", async () => {
    const amira = await getStudentForGuardian(1);
    expect(amira).toMatchObject({
      firstName: "Amira",
      allergies: "Penicillin",
      status: "active",
      fee: { cents: 20000, note: "Sibling discount" },
      place: {
        className: "Level 1",
        sessionName: "Saturday",
        dayOfWeek: 6,
        startTime: "10:00",
        classTeacherName: "Omar Teacher",
      },
    });
    expect(amira?.place?.periods).toEqual([
      expect.objectContaining({
        subjectName: "Quran",
        teacherName: "Omar Teacher",
        durationMinutes: 50,
      }),
      expect.objectContaining({ title: "Break", teacherName: null }),
      expect.objectContaining({ subjectName: "Arabic", teacherName: null }),
    ]);
    const zayd = await getStudentForGuardian(2);
    expect(zayd).toMatchObject({
      status: "applied",
      preferredSessionName: "Saturday",
      place: null,
      fee: null,
    });
    expect(JSON.stringify([amira, zayd])).not.toMatch(/SECRET/);
    // Nothing about the guardian is read from here; that is the guardian's own account page.
    expect(statements.some((s) => s.includes('"guardians"'))).toBe(false);
  });

  it("getStudentForStudent: name and timetable only", async () => {
    statements.length = 0;
    const me = await getStudentForStudent(1);
    expect(me).toEqual({
      id: 1,
      studentId: null,
      firstName: "Amira",
      place: expect.objectContaining({ className: "Level 1" }),
    });
    expect(me).not.toHaveProperty("allergies");
    expect(statements.some((s) => s.includes('"guardians"'))).toBe(false);
  });
});
