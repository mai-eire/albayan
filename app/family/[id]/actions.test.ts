import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/current-user";
import type { Db } from "@/lib/db";
import { auditLog, guardians, studentGuardians, students, users } from "@/lib/db/schema";
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

const { updateChildDetails, updateChildHealth } = await import("./actions");

const parent: CurrentUser = {
  id: 2,
  name: "Parent",
  email: "p@example.com",
  phone: null,
  isAdmin: false,
  emailVerified: true,
  emailNotifications: true,
  mustChangePassword: false,
  guardian: { id: 1 },
  teacher: null,
  student: null,
  areas: ["family"],
};

const stranger: CurrentUser = { ...parent, id: 3, guardian: { id: 2 } };

const details = {
  firstName: "Zayd",
  lastName: "Khan",
  dateOfBirth: "2017-03-02",
  gender: "male" as const,
  schoolYearGroup: "3rd class",
  isHomeschooled: false,
};

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  await db.insert(users).values([
    { id: 2, name: "Parent", email: "p@example.com" },
    { id: 3, name: "Stranger", email: "s@example.com" },
  ]);
  await db.insert(guardians).values([
    { id: 1, userId: 2 },
    { id: 2, userId: 3 },
  ]);
  await db.insert(students).values({
    id: 1,
    ...details,
    status: "active",
    appliedAt: "2026-08-20T10:00:00.000Z",
    createdByGuardianId: 1,
  });
  await db
    .insert(studentGuardians)
    .values({ studentId: 1, guardianId: 1, relationship: "father", isPrimaryContact: true });
});
afterAll(() => dispose());

describe("a guardian keeping their child's record straight", () => {
  it("saves the facts they know best and audits the change", async () => {
    current = parent;
    expect(
      await updateChildDetails({
        id: 1,
        ...details,
        firstName: "Zaid",
        schoolYearGroup: "4th class",
      }),
    ).toMatchObject({ ok: true });
    expect(await db.query.students.findFirst({ where: eq(students.id, 1) })).toMatchObject({
      firstName: "Zaid",
      schoolYearGroup: "4th class",
    });

    expect(
      await updateChildHealth({ id: 1, allergies: ["Peanuts", "Dairy"], medicalNotes: "Inhaler" }),
    ).toMatchObject({ ok: true });
    expect(await db.query.students.findFirst({ where: eq(students.id, 1) })).toMatchObject({
      allergies: "Peanuts, Dairy",
      medicalNotes: "Inhaler",
    });

    const entries = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "student.update_by_guardian"));
    expect(entries).toHaveLength(2);
    expect(entries[0].changes).toMatchObject({ firstName: ["Zayd", "Zaid"] });
  });

  it("refuses someone else's child and a date of birth that can't be right", async () => {
    current = stranger;
    expect(await updateChildDetails({ id: 1, ...details })).toMatchObject({
      ok: false,
      error: /isn't yours/,
    });
    expect(await updateChildHealth({ id: 1, allergies: [], medicalNotes: "" })).toMatchObject({
      ok: false,
      error: /isn't yours/,
    });

    current = parent;
    expect(
      await updateChildDetails({ id: 1, ...details, dateOfBirth: "1990-01-01" }),
    ).toMatchObject({ ok: false, error: /date of birth/ });
    expect(await updateChildDetails({ id: 1, ...details, schoolYearGroup: "" })).toMatchObject({
      ok: false,
      fieldErrors: { schoolYearGroup: /school year/ },
    });
  });
});
