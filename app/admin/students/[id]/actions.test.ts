import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/current-user";
import type { Db } from "@/lib/db";
import { auditLog, guardians, students, users } from "@/lib/db/schema";
import { testDb } from "@/test/db";

let db: Db;
let dispose: () => Promise<void>;
let current: CurrentUser | null = null;

vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  db: async () => db,
}));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: async () => current }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { updateStudentDetails, updateStudentHealth, updateStudentCountry } =
  await import("./actions");

const admin: CurrentUser = {
  id: 1,
  name: "Admin",
  email: "a@example.com",
  isAdmin: true,
  phone: null,
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
  await db.insert(students).values({
    id: 1,
    firstName: "Zayd",
    lastName: "Ali",
    gender: "male",
    dateOfBirth: "2018-05-04",
    appliedAt: "2026-09-01T00:00:00.000Z",
    createdByGuardianId: 1,
  });
});
afterAll(() => dispose());

const details = {
  id: 1,
  firstName: "Zayd",
  lastName: "Ali",
  dateOfBirth: "2018-05-04",
  gender: "male",
  schoolYearGroup: "",
  isHomeschooled: false,
  arabicProficiency: "none",
  email: "",
  phone: "",
};

describe("student profile edits", () => {
  it("denies non-admins", async () => {
    current = { ...admin, isAdmin: false, areas: [] };
    expect(await updateStudentHealth({ id: 1, allergies: "Nuts", medicalNotes: "" })).toMatchObject(
      {
        ok: false,
        error: /access/,
      },
    );
  });

  it("audits only the fields that changed and skips no-op saves", async () => {
    current = admin;
    expect(await updateStudentDetails(details)).toEqual({ ok: true, data: undefined });
    expect(await db.select().from(auditLog)).toHaveLength(0);

    expect(
      await updateStudentDetails({
        ...details,
        schoolYearGroup: "2nd class",
        arabicProficiency: "beginner",
      }),
    ).toEqual({ ok: true, data: undefined });
    expect(await updateStudentHealth({ id: 1, allergies: "Nuts", medicalNotes: "" })).toMatchObject(
      { ok: true },
    );
    expect(await updateStudentCountry({ id: 1, countryOfOrigin: "Arab" })).toMatchObject({
      ok: true,
    });

    expect(await db.query.students.findFirst({ where: eq(students.id, 1) })).toMatchObject({
      schoolYearGroup: "2nd class",
      arabicProficiency: "beginner",
      allergies: "Nuts",
      medicalNotes: null,
      countryOfOrigin: "Arab",
    });
    const entries = await db.select().from(auditLog);
    expect(entries.map((e) => [e.action, e.changes])).toEqual([
      [
        "student.update_details",
        { schoolYearGroup: [null, "2nd class"], arabicProficiency: ["none", "beginner"] },
      ],
      ["student.update_health", { allergies: [null, "Nuts"] }],
      ["student.update_country", { countryOfOrigin: [null, "Arab"] }],
    ]);
  });

  it("validates", async () => {
    current = admin;
    expect(
      await updateStudentDetails({ ...details, firstName: "", dateOfBirth: "yesterday" }),
    ).toMatchObject({
      ok: false,
      fieldErrors: {
        firstName: "Enter their first name",
        dateOfBirth: "Enter their date of birth",
      },
    });
    expect(await updateStudentHealth({ id: 99, allergies: "", medicalNotes: "" })).toMatchObject({
      ok: false,
      error: /no longer exists/,
    });
  });
});
