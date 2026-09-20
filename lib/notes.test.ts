import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/current-user";
import type { Db } from "@/lib/db";
import {
  academicYears,
  classes,
  enrolments,
  guardians,
  notifications,
  schoolSessions,
  studentGuardians,
  studentNotes,
  students,
  teachers,
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
vi.mock("@/lib/db/queries/settings", () => ({ getSchoolSettings: async () => ({ name: "Test" }) }));
vi.mock("@/lib/app-url", () => ({ appUrl: async (p: string) => `http://localhost:3000${p}` }));
vi.mock("@/lib/email", () => ({ sendNotice: async () => {} }));
vi.mock("next/server", () => ({ after: (work: () => Promise<void>) => void work() }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { addNote, deleteNote } = await import("./notes");
const { listNotesForGuardian, listNotesForStaff, listNotesForStudent } =
  await import("./db/queries/notes");

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
  name: "Omar",
  teacher: { id: 1, isActive: true },
  areas: ["teacher"],
};
const other: CurrentUser = {
  ...base,
  id: 3,
  teacher: { id: 2, isActive: true },
  areas: ["teacher"],
};
const admin: CurrentUser = { ...base, id: 1, isAdmin: true, teacher: null, areas: ["admin"] };

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  await db.insert(users).values([
    { id: 1, name: "Admin", email: "a@example.com", isAdmin: true },
    { id: 2, name: "Omar", email: "t@example.com" },
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
  await db
    .insert(studentGuardians)
    .values({ studentId: 1, guardianId: 1, relationship: "mother", isPrimaryContact: true });
  await db
    .insert(enrolments)
    .values({ studentId: 1, classId: 1, startDate: "2026-09-05", feeCents: 0 });
});
afterAll(() => dispose());

describe("notes", () => {
  it("only a teacher of the student can add; family-visible notes notify the guardian", async () => {
    current = other;
    expect(
      await addNote({ studentId: 1, body: "Hi", category: "general", visibility: "staff" }),
    ).toMatchObject({ ok: false });
    current = teacher;
    expect(
      await addNote({
        studentId: 1,
        body: "Quiet today",
        category: "general",
        visibility: "staff",
      }),
    ).toMatchObject({ ok: true });
    expect(
      await addNote({
        studentId: 1,
        body: "Beautiful recitation",
        category: "praise",
        visibility: "guardians",
      }),
    ).toMatchObject({ ok: true });
    expect(
      await addNote({
        studentId: 1,
        body: "Keep practising page 12",
        category: "general",
        visibility: "guardians_and_student",
      }),
    ).toMatchObject({ ok: true });
    expect((await db.select().from(notifications)).map((n) => n.type)).toEqual([
      "note.shared",
      "note.shared",
    ]);
  });

  it("each viewer's query returns only the visibilities it may see", async () => {
    expect((await listNotesForStaff(1)).map((n) => n.body)).toEqual([
      "Keep practising page 12",
      "Beautiful recitation",
      "Quiet today",
    ]);
    expect((await listNotesForGuardian(1)).map((n) => n.body)).toEqual([
      "Keep practising page 12",
      "Beautiful recitation",
    ]);
    expect((await listNotesForStudent(1)).map((n) => n.body)).toEqual(["Keep practising page 12"]);
  });

  it("soft-deletes: author or admin only, and the note disappears everywhere", async () => {
    const [note] = await listNotesForStudent(1);
    current = other;
    expect(await deleteNote({ id: note.id })).toMatchObject({ ok: false });
    current = admin;
    expect(await deleteNote({ id: note.id })).toMatchObject({ ok: true });
    expect(await listNotesForStudent(1)).toEqual([]);
    expect(await db.select().from(studentNotes)).toHaveLength(3);
  });
});
