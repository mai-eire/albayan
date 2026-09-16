import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/current-user";
import type { Db } from "@/lib/db";
import {
  academicYears,
  auditLog,
  classes,
  guardians,
  schoolSessions,
  studentGuardians,
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
  getSchoolSettings: async () => ({ timezone: "Europe/Dublin" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { submitApplication } = await import("./actions");

const base = {
  name: "Layla",
  email: "l@example.com",
  isAdmin: false,
  mustChangePassword: false,
  teacher: null,
  student: null,
};
const verified: CurrentUser = {
  ...base,
  id: 1,
  emailVerified: true,
  guardian: { id: 1 },
  areas: ["family"],
};
const unverified: CurrentUser = { ...verified, emailVerified: false };

const valid = {
  relationship: "mother",
  addressLine1: "1 Main St",
  addressLine2: "",
  city: "Dublin",
  postalCode: "d15 ab12",
  emergencyContactName: "Huda",
  emergencyContactPhone: "0871234567",
  emergencyContactRelationship: "Aunt",
  firstName: "Zayd",
  lastName: "Ali",
  dateOfBirth: "2018-05-04",
  gender: "male",
  schoolYearGroup: "2nd class",
  arabicProficiency: "beginner",
  allergies: "Peanuts",
  medicalNotes: "",
  preferredSessionId: 1,
  preferredClassId: 1,
  childEthnicity: "Arab",
  guardianEthnicity: null,
  spokenLanguages: ["Arabic", "English"],
  registrationReasons: ["quran", "other"],
  registrationReasonOther: "Friends go here",
};

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  await db.insert(users).values({ id: 1, name: "Layla", email: "l@example.com" });
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
    {
      id: 2,
      academicYearId: "2026-27",
      name: "Old",
      dayOfWeek: 0,
      startTime: "10:00",
      isActive: false,
    },
  ]);
  await db.insert(classes).values([
    { id: 1, academicYearId: "2026-27", sessionId: 1, name: "Level 1" },
    { id: 2, academicYearId: "2026-27", sessionId: 2, name: "Old class" },
  ]);
});
afterAll(() => dispose());

describe("submitApplication", () => {
  it("needs a verified guardian", async () => {
    current = { ...verified, guardian: null };
    expect(await submitApplication(valid)).toMatchObject({ ok: false, error: /access/ });
    current = unverified;
    expect(await submitApplication(valid)).toMatchObject({
      ok: false,
      error: /Confirm your email/,
    });
    expect(await db.select().from(students)).toHaveLength(0);
  });

  it("validates fields and the chosen day and class", async () => {
    current = verified;
    expect(
      await submitApplication({ ...valid, firstName: "", preferredSessionId: null }),
    ).toMatchObject({
      ok: false,
      fieldErrors: { firstName: "Enter their first name", preferredSessionId: "Choose a day" },
    });
    expect(await submitApplication({ ...valid, dateOfBirth: "2000-01-01" })).toMatchObject({
      ok: false,
      error: /date of birth/,
    });
    expect(
      await submitApplication({ ...valid, preferredSessionId: 2, preferredClassId: 2 }),
    ).toMatchObject({
      ok: false,
      error: /no longer available/,
    });
    expect(await submitApplication({ ...valid, preferredClassId: 2 })).toMatchObject({
      ok: false,
      error: /isn't on the day/,
    });
    expect(await db.select().from(students)).toHaveLength(0);
  });

  it("files the child, links the guardian, saves their details and audits", async () => {
    current = verified;
    const result = await submitApplication(valid);
    expect(result).toMatchObject({ ok: true, data: { id: expect.any(Number) } });

    const [student] = await db.select().from(students);
    expect(student).toMatchObject({
      firstName: "Zayd",
      status: "applied",
      studentId: null,
      preferredSessionId: 1,
      preferredClassId: 1,
      ethnicity: "Arab",
      medicalNotes: null,
      createdByGuardianId: 1,
    });
    expect(await db.select().from(studentGuardians)).toEqual([
      expect.objectContaining({
        studentId: student.id,
        guardianId: 1,
        relationship: "mother",
        isPrimaryContact: true,
      }),
    ]);
    const guardian = await db.query.guardians.findFirst({ where: eq(guardians.id, 1) });
    expect(guardian).toMatchObject({
      postalCode: "D15 AB12",
      area: "D15",
      addressLine2: null,
      spokenLanguages: ["Arabic", "English"],
      ethnicity: null,
      registrationReasons: ["quran", "other"],
      registrationReasonOther: "Friends go here",
    });
    expect(await db.select().from(auditLog)).toEqual([
      expect.objectContaining({
        actorUserId: 1,
        action: "student.apply",
        entityId: String(student.id),
      }),
    ]);
  });
});
