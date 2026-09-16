import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { testDb } from "@/test/db";
import * as s from "./schema";

let db: Db;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  await db.insert(s.users).values([
    { id: 1, name: "Guardian", email: "g@example.com" },
    { id: 2, name: "Teacher", email: "t@example.com" },
  ]);
  await db.insert(s.guardians).values({ id: 1, userId: 1 });
  await db.insert(s.teachers).values({ id: 1, userId: 2 });
  await db
    .insert(s.academicYears)
    .values({ id: "2026-27", startDate: "2026-09-05", endDate: "2027-06-27" });
  await db.insert(s.subjects).values({ id: "quran", name: "Quran" });
  await db.insert(s.schoolSessions).values({
    id: 1,
    academicYearId: "2026-27",
    name: "Saturday",
    dayOfWeek: 6,
    startTime: "10:00",
  });
  await db.insert(s.classes).values([
    { id: 1, academicYearId: "2026-27", sessionId: 1, name: "Level 1" },
    { id: 2, academicYearId: "2026-27", sessionId: 1, name: "Level 2" },
  ]);
  await db.insert(s.students).values({ ...student, id: 1 });
});

afterAll(() => dispose());

const student = {
  firstName: "A",
  lastName: "B",
  gender: "female" as const,
  dateOfBirth: "2018-01-01",
  appliedAt: "2026-09-01T00:00:00Z",
  createdByGuardianId: 1,
};

// Drizzle wraps D1 errors; the constraint name is in the cause.
async function fails(query: Promise<unknown>, pattern: RegExp) {
  const error = await query.then(
    () => undefined,
    (e: Error) => e,
  );
  expect(error, "expected the query to fail").toBeDefined();
  const cause = (error?.cause as Error | undefined)?.message ?? "";
  expect(`${error?.message} ${cause}`).toMatch(pattern);
}

describe("schema v1 constraints", () => {
  it("rejects an unknown user status", () =>
    fails(
      db
        .insert(s.users)
        .values({ name: "X", email: "x@example.com", status: "banned" as "active" }),
      /CHECK/,
    ));

  it("requires a unique email", () =>
    fails(db.insert(s.users).values({ name: "Dup", email: "g@example.com" }), /UNIQUE/));

  it("allows one guardian row per user", () =>
    fails(db.insert(s.guardians).values({ userId: 1 }), /UNIQUE/));

  it("keeps day_of_week within 0–6", () =>
    fails(
      db
        .insert(s.schoolSessions)
        .values({ academicYearId: "2026-27", name: "Bad", dayOfWeek: 7, startTime: "10:00" }),
      /CHECK/,
    ));

  it("requires exactly one of subject or title on a period", async () => {
    await fails(
      db.insert(s.sessionPeriods).values({ sessionId: 1, sortOrder: 1, durationMinutes: 50 }),
      /CHECK/,
    );
    await fails(
      db.insert(s.sessionPeriods).values({
        sessionId: 1,
        sortOrder: 1,
        subjectId: "quran",
        title: "Break",
        durationMinutes: 50,
      }),
      /CHECK/,
    );
    await db.insert(s.sessionPeriods).values([
      { sessionId: 1, sortOrder: 1, subjectId: "quran", durationMinutes: 50 },
      { sessionId: 1, sortOrder: 2, title: "Break", durationMinutes: 15 },
    ]);
  });

  it("rejects a non-positive period duration", () =>
    fails(
      db
        .insert(s.sessionPeriods)
        .values({ sessionId: 1, sortOrder: 3, title: "Nothing", durationMinutes: 0 }),
      /CHECK/,
    ));

  it("allows one teacher per subject per class", async () => {
    await db.insert(s.teachingAssignments).values({ classId: 1, subjectId: "quran", teacherId: 1 });
    await fails(
      db.insert(s.teachingAssignments).values({ classId: 1, subjectId: "quran", teacherId: 1 }),
      /UNIQUE/,
    );
  });

  it("allows one active enrolment per student, but keeps history", async () => {
    await db
      .insert(s.enrolments)
      .values({ studentId: 1, classId: 1, startDate: "2026-09-05", feeCents: 25000 });
    await fails(
      db
        .insert(s.enrolments)
        .values({ studentId: 1, classId: 2, startDate: "2026-09-05", feeCents: 25000 }),
      /UNIQUE/,
    );
    await db.insert(s.enrolments).values({
      studentId: 1,
      classId: 2,
      startDate: "2025-09-06",
      endDate: "2026-06-27",
      status: "left",
      feeCents: 20000,
    });
  });

  it("rejects a negative fee", () =>
    fails(
      db.insert(s.enrolments).values({
        studentId: 1,
        classId: 2,
        startDate: "2026-09-05",
        status: "left",
        feeCents: -1,
      }),
      /CHECK/,
    ));

  it("CHECK-constrains student enums", async () => {
    await fails(db.insert(s.students).values({ ...student, gender: "x" as "male" }), /CHECK/);
    await fails(
      db.insert(s.students).values({ ...student, arabicProficiency: "fluent" as "native" }),
      /CHECK/,
    );
    await fails(
      db.insert(s.students).values({ ...student, status: "pending" as "applied" }),
      /CHECK/,
    );
  });

  it("enforces foreign keys", () =>
    fails(db.insert(s.teachers).values({ userId: 999 }), /FOREIGN KEY/));

  it("stores JSON lists and reads them back as arrays", async () => {
    await db
      .update(s.guardians)
      .set({ spokenLanguages: ["Arabic", "English"] })
      .where(eq(s.guardians.id, 1));
    const [g] = await db.select().from(s.guardians);
    expect(g.spokenLanguages).toEqual(["Arabic", "English"]);
    expect(g.registrationReasons).toEqual([]);
  });

  it("fills ISO timestamps by default", async () => {
    const [g] = await db.select().from(s.guardians);
    expect(g.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe("schema v2 constraints", () => {
  it("allows one attendance row per student per day", async () => {
    const row = { studentId: 1, classId: 1, date: "2026-09-19", recordedByUserId: 2 };
    await db.insert(s.attendance).values(row);
    await fails(db.insert(s.attendance).values({ ...row, status: "absent" }), /UNIQUE/);
    await fails(
      db.insert(s.attendance).values({ ...row, date: "2026-09-26", status: "asleep" as "late" }),
      /attendance_status/,
    );
  });

  it("CHECK-constrains note category and visibility", async () => {
    await db
      .insert(s.studentNotes)
      .values({ studentId: 1, authorUserId: 2, body: "Great reading" });
    await fails(
      db
        .insert(s.studentNotes)
        .values({ studentId: 1, authorUserId: 2, body: "x", category: "gossip" as "general" }),
      /student_notes_category/,
    );
    await fails(
      db
        .insert(s.studentNotes)
        .values({ studentId: 1, authorUserId: 2, body: "x", visibility: "everyone" as "staff" }),
      /student_notes_visibility/,
    );
  });

  it("gives every resource exactly one target and the right fields for its kind", async () => {
    const link = {
      title: "Site",
      kind: "link" as const,
      url: "https://example.com",
      uploadedByUserId: 2,
    };
    await db.insert(s.resources).values({ ...link, isSchoolWide: true });
    await db.insert(s.resources).values({ ...link, classId: 1, subjectId: "quran" });
    await db.insert(s.resources).values({ ...link, studentId: 1 });
    await fails(db.insert(s.resources).values(link), /resources_one_target/);
    await fails(
      db.insert(s.resources).values({ ...link, isSchoolWide: true, classId: 1 }),
      /resources_one_target/,
    );
    await fails(
      db.insert(s.resources).values({ ...link, subjectId: "quran", studentId: 1 }),
      /resources_one_target/,
    );
    await fails(
      db.insert(s.resources).values({ ...link, isSchoolWide: true, kind: "file" }),
      /resources_kind_fields/,
    );
    await fails(
      db.insert(s.resources).values({
        title: "F",
        kind: "file",
        storageKey: "k",
        url: "https://x",
        uploadedByUserId: 2,
        isSchoolWide: true,
      }),
      /resources_kind_fields/,
    );
  });
});

describe("schema v3 constraints", () => {
  it("payments need a positive amount and a known method", async () => {
    const [active] = await db
      .select({ id: s.enrolments.id })
      .from(s.enrolments)
      .where(eq(s.enrolments.status, "active"));
    const payment = {
      enrolmentId: active.id,
      amountCents: 10000,
      paidOn: "2026-09-10",
      method: "cash" as const,
      recordedByUserId: 2,
    };
    await db.insert(s.payments).values(payment);
    await fails(db.insert(s.payments).values({ ...payment, amountCents: 0 }), /payments_amount/);
    await fails(
      db.insert(s.payments).values({ ...payment, method: "cheque" as "cash" }),
      /payments_method/,
    );
  });

  it("events check their type, audience, dates and fee; targets name one thing; one row per child", async () => {
    const event = {
      title: "Trip",
      type: "trip" as const,
      startAt: "2026-10-10T09:00:00Z",
      endAt: "2026-10-10T15:00:00Z",
      createdByUserId: 2,
    };
    const [{ id }] = await db.insert(s.events).values(event).returning({ id: s.events.id });
    await fails(db.insert(s.events).values({ ...event, type: "party" as "trip" }), /events_type/);
    await fails(
      db.insert(s.events).values({ ...event, endAt: "2026-10-09T09:00:00Z" }),
      /events_dates/,
    );
    await fails(db.insert(s.events).values({ ...event, feeCents: -1 }), /events_fee/);
    await db.insert(s.eventTargets).values({ eventId: id, sessionId: 1 });
    await fails(db.insert(s.eventTargets).values({ eventId: id }), /event_targets_one/);
    await fails(
      db.insert(s.eventTargets).values({ eventId: id, sessionId: 1, classId: 1 }),
      /event_targets_one/,
    );
    await db.insert(s.eventParticipants).values({ eventId: id, studentId: 1 });
    await fails(db.insert(s.eventParticipants).values({ eventId: id, studentId: 1 }), /UNIQUE/);
    await fails(
      db
        .insert(s.eventParticipants)
        .values({ eventId: id, studentId: 1, status: "maybe" as "registered" }),
      /UNIQUE|event_participants_status/,
    );
  });
});
