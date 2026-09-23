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

const {
  getClassForTeacher,
  getStudentForTeacher,
  listClassesForTeacher,
  listDayForTeacher,
  listLessonsForTeacher,
} = await import("./teach");

// Every column a teacher must never see (CLAUDE.md "Privacy is structural"), by table.
// What a teacher-facing query may never select. A teacher does see the neutral facts of
// the application, including the session and class the family asked for (decision
// 2026-09-23); what the family wrote and why a place was refused stay with the office.
const hidden = {
  students: ["ethnicity", "phone", "email", "application_notes", "declined_reason"],
  guardians: [
    "address_line1",
    "address_line2",
    "city",
    "postal_code",
    "area",
    "spoken_languages",
    "ethnicity",
    "registration_reasons",
    "registration_reason_other",
  ],
  users: ["email", "phone"],
};

beforeAll(async () => {
  const fresh = await testDb();
  dispose = fresh.dispose;
  db = dbFor(fresh.d1, { logQuery: (query) => statements.push(query) });
  await db.insert(users).values([
    { id: 1, name: "Maryam Parent", email: "SECRET-EMAIL@example.com", phone: "SECRET-PHONE" },
    { id: 2, name: "Omar Teacher", email: "omar@example.com" },
  ]);
  await db.insert(guardians).values({
    id: 1,
    userId: 1,
    addressLine1: "SECRET-ADDRESS",
    city: "SECRET-CITY",
    postalCode: "SECRET-CODE",
    area: "D15",
    emergencyContactName: "Zainab",
    emergencyContactPhone: "0860000000",
    emergencyContactRelationship: "Grandmother",
    spokenLanguages: ["SECRET-LANGUAGE"],
    ethnicity: "SECRET-ETHNICITY",
    registrationReasons: ["other"],
    registrationReasonOther: "SECRET-REASON",
  });
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
  await db
    .insert(classes)
    .values({ id: 1, academicYearId: "2026-27", sessionId: 1, name: "Level 1", classTeacherId: 1 });
  await db.insert(subjects).values({ id: "quran", name: "Quran" });
  await db.insert(teachingAssignments).values({ classId: 1, subjectId: "quran", teacherId: 1 });
  await db.insert(students).values({
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
    applicationNotes: "SECRET-NOTES",
  });
  await db
    .insert(studentGuardians)
    .values({ studentId: 1, guardianId: 1, relationship: "mother", isPrimaryContact: true });
  await db
    .insert(enrolments)
    .values({ studentId: 1, classId: 1, startDate: "2026-09-05", feeCents: 25000 });
  statements.length = 0;
});
afterAll(() => dispose());

// Column names in the logged SQL are quoted; check each hidden column against the table
// it lives in so a same-named column elsewhere (users.email vs students.email) can't hide.
function selectedColumns(sql: string, table: string): string[] {
  const aliasMatch = sql.match(new RegExp(`"${table}"(?: "([a-z_]+)")?`));
  const alias = aliasMatch?.[1] ?? table;
  return [...sql.matchAll(new RegExp(`"${alias}"\\."([a-z_0-9]+)"`, "g"))].map((m) => m[1]);
}

function assertNothingHidden() {
  for (const sql of statements) {
    for (const [table, columns] of Object.entries(hidden)) {
      if (!sql.includes(`"${table}"`)) continue;
      const selected = selectedColumns(sql, table);
      for (const column of columns) {
        expect(selected, `${table}.${column} in: ${sql}`).not.toContain(column);
      }
    }
  }
}

describe("teacher queries", () => {
  it("getStudentForTeacher returns health and emergency contacts but never the sensitive columns", async () => {
    const student = await getStudentForTeacher(1);
    expect(student).toMatchObject({
      firstName: "Amira",
      allergies: "Penicillin",
      className: "Level 1",
      guardians: [
        expect.objectContaining({
          name: "Maryam Parent",
          relationship: "mother",
          emergencyContactName: "Zainab",
          emergencyContactPhone: "0860000000",
        }),
      ],
    });
    expect(JSON.stringify(student)).not.toMatch(/SECRET/);
    assertNothingHidden();
  });

  it("class roster and class list never select them either", async () => {
    statements.length = 0;
    const cls = await getClassForTeacher(1);
    expect(cls?.roster).toEqual([
      expect.objectContaining({ firstName: "Amira", hasAllergies: true, hasMedicalNotes: false }),
    ]);
    const mine = await listClassesForTeacher(1, "2026-27");
    expect(mine).toEqual([
      expect.objectContaining({
        name: "Level 1",
        isClassTeacher: true,
        subjects: ["Quran"],
        studentCount: 1,
      }),
    ]);
    expect(JSON.stringify([cls, mine])).not.toMatch(/SECRET/);
    assertNothingHidden();
  });
});

describe("listLessonsForTeacher", () => {
  it("lists my periods on that weekday with computed times and the register flag", async () => {
    await db.insert(subjects).values({ id: "arabic", name: "Arabic" });
    await db.insert(sessionPeriods).values([
      { sessionId: 1, sortOrder: 0, subjectId: "quran", durationMinutes: 50 },
      { sessionId: 1, sortOrder: 1, title: "Break", durationMinutes: 10 },
      { sessionId: 1, sortOrder: 2, subjectId: "arabic", durationMinutes: 50 },
    ]);
    await db.insert(users).values({ id: 3, name: "Second Teacher", email: "s@example.com" });
    await db.insert(teachers).values({ id: 2, userId: 3 });
    await db
      .insert(classes)
      .values({ id: 2, academicYearId: "2026-27", sessionId: 1, name: "Level 2" });
    await db.insert(teachingAssignments).values([
      { classId: 1, subjectId: "arabic", teacherId: 2 },
      { classId: 2, subjectId: "arabic", teacherId: 2 },
    ]);

    expect(await listLessonsForTeacher(1, "2026-27", 6)).toEqual([
      expect.objectContaining({
        className: "Level 1",
        subjectName: "Quran",
        startTime: "10:00",
        endTime: "10:50",
      }),
    ]);
    // The register is the class teacher's, lessons or not.
    expect((await listDayForTeacher(1, "2026-27", 6)).registers).toEqual([
      { classId: 1, className: "Level 1" },
    ]);
    expect((await listDayForTeacher(2, "2026-27", 6)).registers).toEqual([]);
    // Teacher 2 teaches Arabic in both classes but leads neither.
    expect(await listLessonsForTeacher(2, "2026-27", 6)).toEqual([
      expect.objectContaining({
        className: "Level 1",
        subjectName: "Arabic",
        startTime: "11:00",
      }),
      expect.objectContaining({
        className: "Level 2",
        subjectName: "Arabic",
        startTime: "11:00",
      }),
    ]);
    expect(await listLessonsForTeacher(1, "2026-27", 3)).toEqual([]);
  });
});
