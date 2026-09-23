import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/current-user";
import type { Db } from "@/lib/db";
import {
  academicYears,
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

const { updateApplication } = await import("./actions");

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

// What the form sends: allergies as a list, joined before they are stored.
const application = {
  firstName: "Zayd",
  lastName: "Khan",
  dateOfBirth: "2017-03-02",
  gender: "male" as const,
  schoolYearGroup: "3rd class",
  isHomeschooled: false,
  arabicProficiency: "beginner" as const,
  allergies: [] as string[],
  medicalNotes: "",
  applicationNotes: "Would like to be with his cousin.",
  preferredSessionId: 1 as number | null,
  preferredClassId: null as number | null,
};

const stored = { ...application, allergies: null };

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  await db.insert(users).values([
    { id: 1, name: "Admin", email: "a@example.com", isAdmin: true },
    { id: 2, name: "Parent", email: "p@example.com" },
  ]);
  await db.insert(guardians).values({ id: 1, userId: 2 });
  await db
    .insert(academicYears)
    .values({ id: "2026-27", startDate: "2026-09-01", endDate: "2027-06-30", isCurrent: true });
  await db.insert(schoolSessions).values([
    { id: 1, academicYearId: "2026-27", name: "Saturday", dayOfWeek: 6, startTime: "10:00" },
    { id: 2, academicYearId: "2026-27", name: "Sunday", dayOfWeek: 0, startTime: "10:00" },
  ]);
  await db.insert(classes).values({ id: 1, academicYearId: "2026-27", sessionId: 2, name: "L1" });
  await db.insert(students).values([
    {
      id: 1,
      ...stored,
      status: "applied",
      applicationYearId: "2026-27",
      appliedAt: "2026-08-20T10:00:00.000Z",
      createdByGuardianId: 1,
    },
    {
      id: 2,
      ...stored,
      firstName: "Sara",
      status: "active",
      applicationYearId: "2026-27",
      appliedAt: "2026-08-20T10:00:00.000Z",
      approvedAt: "2026-08-25T10:00:00.000Z",
      createdByGuardianId: 1,
    },
  ]);
  await db.insert(studentGuardians).values([
    { studentId: 1, guardianId: 1, relationship: "father", isPrimaryContact: true },
    { studentId: 2, guardianId: 1, relationship: "father", isPrimaryContact: true },
  ]);
});
afterAll(() => dispose());

describe("updateApplication", () => {
  it("lets the family correct a waiting application and nothing else", async () => {
    current = null;
    expect(await updateApplication({ id: 1, ...application })).toMatchObject({ ok: false });

    current = parent;
    // A class has to be on the day chosen.
    expect(await updateApplication({ id: 1, ...application, preferredClassId: 1 })).toMatchObject({
      ok: false,
      error: /isn't on the day/,
    });

    expect(
      await updateApplication({
        id: 1,
        ...application,
        preferredSessionId: 2,
        preferredClassId: 1,
        applicationNotes: "His cousin moved to Sunday.",
      }),
    ).toMatchObject({ ok: true });
    expect(await db.query.students.findFirst({ where: eq(students.id, 1) })).toMatchObject({
      preferredSessionId: 2,
      preferredClassId: 1,
      applicationNotes: "His cousin moved to Sunday.",
      applicationYearId: "2026-27",
    });

    // Once the office has decided, it is theirs.
    expect(await updateApplication({ id: 2, ...application })).toMatchObject({
      ok: false,
      error: /already decided/,
    });
  });
});
