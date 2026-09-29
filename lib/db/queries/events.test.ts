import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db";
import {
  academicYears,
  classes,
  eventTargets,
  events,
  schoolSessions,
  users,
} from "@/lib/db/schema";
import { testDb } from "@/test/db";

let db: Db;
let dispose: () => Promise<void>;

vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  db: async () => db,
}));

const { listEventsForAdmin, listEventsForViewer } = await import("./events");

const year = { from: "2026-09-01", to: "2027-06-30" };

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  await db.insert(users).values({ id: 1, name: "Admin", email: "a@example.com", isAdmin: true });
  await db.insert(academicYears).values({
    id: "2026-27",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    isCurrent: true,
  });
  await db.insert(schoolSessions).values([
    { id: 1, academicYearId: "2026-27", name: "Saturday", dayOfWeek: 6, startTime: "10:00" },
    { id: 2, academicYearId: "2026-27", name: "Sunday", dayOfWeek: 0, startTime: "10:00" },
  ]);
  await db.insert(classes).values([
    { id: 1, academicYearId: "2026-27", sessionId: 1, name: "Level 1" },
    { id: 2, academicYearId: "2026-27", sessionId: 2, name: "Level 1" },
  ]);
  await db.insert(events).values([
    {
      id: 1,
      title: "Mid-term break",
      type: "holiday",
      startAt: "2026-10-24",
      endAt: "2026-11-01",
      isPublished: true,
      createdByUserId: 1,
    },
    {
      id: 2,
      title: "Saturday closed",
      type: "closure",
      startAt: "2026-10-10",
      endAt: "2026-10-10",
      audience: "selected_sessions",
      isPublished: true,
      createdByUserId: 1,
    },
    {
      id: 3,
      title: "Level 1 Sunday trip",
      type: "trip",
      startAt: "2026-11-15T10:00",
      endAt: "2026-11-15T14:00",
      audience: "selected_classes",
      isPublished: true,
      createdByUserId: 1,
    },
    {
      id: 4,
      title: "Summer school",
      type: "summer_school",
      startAt: "2027-06-21",
      endAt: "2027-06-25",
      isPublished: false,
      createdByUserId: 1,
    },
    {
      id: 5,
      title: "Last year's outing",
      type: "trip",
      startAt: "2026-06-01",
      endAt: "2026-06-01",
      isPublished: true,
      createdByUserId: 1,
    },
  ]);
  await db.insert(eventTargets).values([
    { eventId: 2, sessionId: 1, classId: null },
    { eventId: 3, sessionId: null, classId: 2 },
  ]);
});
afterAll(() => dispose());

describe("listEventsForViewer", () => {
  const titles = (rows: { title: string }[]) => rows.map((r) => r.title);

  it("gives everyone the school's own dates, in date order", async () => {
    const rows = await listEventsForViewer(year, { sessionIds: [], classIds: [] });
    expect(titles(rows)).toEqual(["Mid-term break"]);
  });

  it("adds what is aimed at the viewer's day or class, and nothing aimed elsewhere", async () => {
    const saturday = await listEventsForViewer(year, { sessionIds: [1], classIds: [1] });
    expect(titles(saturday)).toEqual(["Saturday closed", "Mid-term break"]);

    const sunday = await listEventsForViewer(year, { sessionIds: [2], classIds: [2] });
    expect(titles(sunday)).toEqual(["Mid-term break", "Level 1 Sunday trip"]);
  });

  it("never shows a draft, and never last year's", async () => {
    const rows = await listEventsForViewer(year, { sessionIds: [1, 2], classIds: [1, 2] });
    expect(titles(rows)).not.toContain("Summer school");
    expect(titles(rows)).not.toContain("Last year's outing");
  });

  it("carries who each entry is for, by name", async () => {
    const rows = await listEventsForViewer(year, { sessionIds: [1], classIds: [1] });
    const closure = rows.find((r) => r.title === "Saturday closed");
    expect(closure).toMatchObject({ targetNames: ["Saturday"], sessionIds: [1], classIds: [] });
  });
});

describe("listEventsForAdmin", () => {
  it("shows the year's entries including drafts, and leaves other years out", async () => {
    const rows = await listEventsForAdmin(year);
    expect(rows.map((r) => r.title)).toEqual([
      "Saturday closed",
      "Mid-term break",
      "Level 1 Sunday trip",
      "Summer school",
    ]);
    expect(rows.find((r) => r.title === "Summer school")?.isPublished).toBe(false);
  });
});
