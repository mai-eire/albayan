import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { bool, timestamps } from "../columns";
import { classes, schoolSessions } from "./academics";
import { users } from "./auth";
import { guardians } from "./people";
import { students } from "./students";

// Two families of entry, and the UI groups them this way: the school's own dates, which
// nobody opts into, and the activities a family may choose. `lib/events.ts` holds the split.
export const eventTypes = [
  "trip",
  "camp",
  "summer_school",
  "club",
  "sports_day",
  "community",
  "parent_teacher_meeting",
  "exam",
  "holiday",
  "closure",
  "other",
] as const;
export const eventAudiences = ["whole_school", "selected_sessions", "selected_classes"] as const;
export const participantStatuses = ["registered", "withdrawn"] as const;

export type EventType = (typeof eventTypes)[number];
export type EventAudience = (typeof eventAudiences)[number];
export type ParticipantStatus = (typeof participantStatuses)[number];

// Holidays, exams and closures are events too; they only differ in type. A fee is shown,
// never collected here (decision 2026-09-16). `startAt`/`endAt` are a plain date
// (YYYY-MM-DD) for an all-day entry and a date and time (YYYY-MM-DDTHH:MM) for one that
// starts at a time — both sort and compare as text, and `lib/events.ts` reads them.
export const events = sqliteTable(
  "events",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    description: text(),
    type: text({ enum: eventTypes }).notNull(),
    startAt: text().notNull(),
    endAt: text().notNull(),
    location: text(),
    isPublished: bool().notNull().default(false),
    requiresRegistration: bool().notNull().default(false),
    requiresConsent: bool().notNull().default(false),
    feeCents: integer(),
    audience: text({ enum: eventAudiences }).notNull().default("whole_school"),
    createdByUserId: integer()
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [
    index("events_start").on(t.startAt),
    check(
      "events_type",
      sql`${t.type} in ('trip', 'camp', 'summer_school', 'club', 'sports_day', 'community', 'parent_teacher_meeting', 'exam', 'holiday', 'closure', 'other')`,
    ),
    check(
      "events_audience",
      sql`${t.audience} in ('whole_school', 'selected_sessions', 'selected_classes')`,
    ),
    check("events_dates", sql`${t.endAt} >= ${t.startAt}`),
    check("events_fee", sql`${t.feeCents} is null or ${t.feeCents} >= 0`),
  ],
);

// Only for audience selected_sessions / selected_classes: exactly one of the two.
export const eventTargets = sqliteTable(
  "event_targets",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    eventId: integer()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    sessionId: integer().references(() => schoolSessions.id),
    classId: integer().references(() => classes.id),
  },
  (t) => [
    index("event_targets_event").on(t.eventId),
    check("event_targets_one", sql`(${t.sessionId} is not null) + (${t.classId} is not null) = 1`),
  ],
);

export const eventParticipants = sqliteTable(
  "event_participants",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    eventId: integer()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    studentId: integer()
      .notNull()
      .references(() => students.id),
    status: text({ enum: participantStatuses }).notNull().default("registered"),
    consentGivenByGuardianId: integer().references(() => guardians.id),
    consentAt: text(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("event_participants_one").on(t.eventId, t.studentId),
    check("event_participants_status", sql`${t.status} in ('registered', 'withdrawn')`),
  ],
);
