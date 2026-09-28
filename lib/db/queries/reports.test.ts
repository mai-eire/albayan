import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db";
import {
  academicYears,
  classes,
  enrolments,
  guardians,
  schoolSessions,
  students,
  users,
} from "@/lib/db/schema";
import { reports } from "@/lib/reports";
import { testDb } from "@/test/db";

let db: Db;
let dispose: () => Promise<void>;

vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  db: async () => db,
}));

const { reportData } = await import("./reports");

const child = (id: number, over: Partial<typeof students.$inferInsert>) => ({
  id,
  firstName: `Child ${id}`,
  lastName: "X",
  gender: "female" as const,
  dateOfBirth: "2018-06-01",
  status: "active" as const,
  appliedAt: "2026-08-01T00:00:00Z",
  createdByGuardianId: 1,
  ...over,
});

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  await db.insert(users).values([
    { id: 1, name: "Parent one", email: "one@example.com" },
    { id: 2, name: "Parent two", email: "two@example.com" },
  ]);
  await db.insert(guardians).values([
    {
      id: 1,
      userId: 1,
      area: "D15",
      spokenLanguages: ["Arabic", "English"],
      registrationReasons: ["quran", "community"],
    },
    { id: 2, userId: 2, area: null, spokenLanguages: ["Somali"], registrationReasons: [] },
  ]);
  await db.insert(academicYears).values([
    { id: "2026-27", startDate: "2026-09-01", endDate: "2027-06-30", isCurrent: true },
    { id: "2025-26", startDate: "2025-09-01", endDate: "2026-06-30" },
  ]);
  await db.insert(schoolSessions).values([
    // Sunday sorts after Saturday, and has nobody in it.
    { id: 1, academicYearId: "2026-27", name: "Sunday", dayOfWeek: 0, startTime: "10:00" },
    { id: 2, academicYearId: "2026-27", name: "Saturday", dayOfWeek: 6, startTime: "10:00" },
    { id: 3, academicYearId: "2025-26", name: "Saturday", dayOfWeek: 6, startTime: "10:00" },
  ]);
  await db.insert(classes).values([
    { id: 1, academicYearId: "2026-27", sessionId: 2, name: "Level 1" },
    { id: 2, academicYearId: "2025-26", sessionId: 3, name: "Level 1" },
  ]);
  await db.insert(students).values([
    child(1, { countryOfOrigin: "Ireland", arabicProficiency: "beginner" }),
    child(2, { countryOfOrigin: "Ireland", gender: "male", dateOfBirth: "2016-06-01" }),
    // Their household answers come from guardian 2: no area, one language, no reasons.
    child(3, { countryOfOrigin: null, createdByGuardianId: 2, arabicProficiency: "native" }),
    // Left the school: no longer counted.
    child(4, { countryOfOrigin: "Egypt", status: "inactive" }),
    // Still an application: not counted either.
    child(5, { countryOfOrigin: "Egypt", status: "applied" }),
    // Last year's child, counted in last year's report only.
    child(6, { countryOfOrigin: "Sudan" }),
  ]);
  await db.insert(enrolments).values([
    { id: 1, studentId: 1, classId: 1, startDate: "2026-09-05", feeCents: 0 },
    { id: 2, studentId: 2, classId: 1, startDate: "2026-09-05", feeCents: 0 },
    { id: 3, studentId: 3, classId: 1, startDate: "2026-09-05", feeCents: 0 },
    { id: 4, studentId: 4, classId: 1, startDate: "2026-09-05", status: "left", feeCents: 0 },
    { id: 6, studentId: 6, classId: 2, startDate: "2025-09-05", feeCents: 0 },
  ]);
});
afterAll(() => dispose());

describe("reportData", () => {
  it("counts the children with a place in the year, and nobody else", async () => {
    const data = await reportData("2026-27");
    expect(data.children).toHaveLength(3);
    expect(data.sessions).toEqual(["Saturday", "Sunday"]);
    expect(await reportData("2025-26")).toMatchObject({ children: [{ countryOfOrigin: "Sudan" }] });
  });

  it("takes the household answers from the guardian who registered the child", async () => {
    const { children } = await reportData("2026-27");
    expect(children.find((c) => c.countryOfOrigin === null)).toMatchObject({
      area: null,
      languages: ["Somali"],
      reasons: [],
    });
    expect(children.filter((c) => c.area === "D15")).toHaveLength(2);
  });
});

describe("reports", () => {
  it("turns the year into the eight tallies the page shows", async () => {
    const byId = Object.fromEntries(
      reports(await reportData("2026-27"), "2026-10-01").map((r) => [r.id, r.data]),
    );
    // One bar per year of age, including the gap nobody is.
    expect(byId.age).toEqual([
      { label: "8", count: 2 },
      { label: "9", count: 0 },
      { label: "10", count: 1 },
    ]);
    // A day nobody comes on is still a day the school runs.
    expect(byId.sessions).toEqual([
      { label: "Saturday", count: 3 },
      { label: "Sunday", count: 0 },
    ]);
    expect(byId.gender).toEqual([
      { label: "Boys", count: 1 },
      { label: "Girls", count: 2 },
    ]);
    expect(byId.arabic).toEqual([
      { label: "None yet", count: 1 },
      { label: "Beginner", count: 1 },
      { label: "Intermediate", count: 0 },
      { label: "Advanced", count: 0 },
      { label: "Native", count: 1 },
    ]);
    // Biggest first; what nobody answered goes last rather than disappearing.
    expect(byId.countries).toEqual([
      { label: "Ireland", count: 2 },
      { label: "Not given", count: 1 },
    ]);
    // A child counts once for each language spoken at home.
    expect(byId.languages).toEqual([
      { label: "Arabic", count: 2 },
      { label: "English", count: 2 },
      { label: "Somali", count: 1 },
    ]);
    expect(byId.areas).toEqual([
      { label: "D15", count: 2 },
      { label: "Not given", count: 1 },
    ]);
    expect(byId.reasons).toEqual([
      { label: "Community and friendships", count: 2 },
      { label: "To learn Quran", count: 2 },
      { label: "Not given", count: 1 },
    ]);
  });

  it("has nothing to say about an empty year", async () => {
    const empty = reports({ children: [], sessions: [] }, "2026-10-01");
    expect(empty.map((r) => r.data.every((d) => d.count === 0))).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
  });
});
