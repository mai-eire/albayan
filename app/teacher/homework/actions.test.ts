import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/current-user";
import type { Db } from "@/lib/db";
import {
  academicYears,
  classes,
  enrolments,
  guardians,
  homework,
  notifications,
  schoolSessions,
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
let current: CurrentUser | null = null;
const emails: string[] = [];

vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  db: async () => db,
}));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: async () => current }));
vi.mock("@/lib/db/queries/settings", () => ({
  getSchoolSettings: async () => ({ name: "Test", timezone: "UTC" }),
}));
vi.mock("@/lib/app-url", () => ({ appUrl: async (p: string) => `http://localhost:3000${p}` }));
vi.mock("@/lib/email", () => ({
  sendNotice: async (to: { email: string }) => {
    emails.push(to.email);
  },
}));
vi.mock("next/server", () => ({ after: (work: () => Promise<void>) => void work() }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { saveHomework, deleteHomework } = await import("./actions");

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
const quranTeacher: CurrentUser = {
  ...base,
  id: 2,
  teacher: { id: 1, isActive: true },
  areas: ["teacher"],
};
const arabicTeacher: CurrentUser = {
  ...base,
  id: 3,
  teacher: { id: 2, isActive: true },
  areas: ["teacher"],
};

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  await db.insert(users).values([
    { id: 2, name: "Quran Teacher", email: "q@example.com" },
    { id: 3, name: "Arabic Teacher", email: "ar@example.com" },
    { id: 4, name: "Parent", email: "p@example.com" },
    { id: 5, name: "Amira", email: "alb-26-0001@students.invalid", username: "alb-26-0001" },
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
  await db.insert(subjects).values([
    { id: "quran", name: "Quran" },
    { id: "arabic", name: "Arabic" },
  ]);
  await db
    .insert(classes)
    .values({ id: 1, academicYearId: "2026-27", sessionId: 1, name: "Level 1" });
  await db.insert(teachingAssignments).values([
    { classId: 1, subjectId: "quran", teacherId: 1 },
    { classId: 1, subjectId: "arabic", teacherId: 2 },
  ]);
  await db.insert(students).values({
    id: 1,
    userId: 5,
    firstName: "Amira",
    lastName: "A",
    gender: "female",
    dateOfBirth: "2018-01-01",
    status: "active",
    appliedAt: "2026-08-01T00:00:00Z",
    createdByGuardianId: 1,
  });
  await db
    .insert(studentGuardians)
    .values({ studentId: 1, guardianId: 1, relationship: "mother", isPrimaryContact: true });
  await db
    .insert(enrolments)
    .values({ studentId: 1, classId: 1, startDate: "2026-09-05", feeCents: 0 });
});
afterAll(() => dispose());

const draft = {
  classId: 1,
  subjectId: "quran",
  title: "Surah Al-Fil",
  description: "",
  dueDate: "2026-09-26",
  publish: false,
};

describe("homework", () => {
  it("only the subject's teacher in that class can set it", async () => {
    current = arabicTeacher;
    expect(await saveHomework(draft)).toMatchObject({ ok: false, error: /subjects you teach/ });
    current = quranTeacher;
    expect(await saveHomework({ ...draft, title: "" })).toMatchObject({
      ok: false,
      fieldErrors: { title: "Give it a title" },
    });
  });

  it("saves a draft silently, publishes once with notifications to guardians and students", async () => {
    current = quranTeacher;
    const created = await saveHomework(draft);
    expect(created).toMatchObject({ ok: true, data: { id: expect.any(Number) } });
    const id = (created as { data: { id: number } }).data.id;
    expect(await db.select().from(notifications)).toHaveLength(0);

    expect(await saveHomework({ ...draft, id, publish: true })).toMatchObject({ ok: true });
    const rows = await db.select().from(notifications);
    expect(rows.map((n) => [n.userId, n.href])).toEqual([
      [4, "/family/1/homework"],
      [5, "/student/homework"],
    ]);
    expect(emails.sort()).toEqual(["alb-26-0001@students.invalid", "p@example.com"]);

    // Editing published homework doesn't notify again.
    expect(
      await saveHomework({ ...draft, id, title: "Surah Al-Fil, verses 1–5", publish: true }),
    ).toMatchObject({ ok: true });
    expect(await db.select().from(notifications)).toHaveLength(2);
    expect(await db.query.homework.findFirst({ where: eq(homework.id, id) })).toMatchObject({
      title: "Surah Al-Fil, verses 1–5",
    });

    current = arabicTeacher;
    expect(await deleteHomework({ id })).toMatchObject({ ok: false });
    current = quranTeacher;
    expect(await deleteHomework({ id })).toMatchObject({ ok: true });
    expect(await db.select().from(homework)).toHaveLength(0);
  });
});
