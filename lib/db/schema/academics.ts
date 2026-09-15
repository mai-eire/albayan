import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { bool, timestamps } from "../columns";
import { teachers } from "./people";

// Natural key: the year's name ("2026-27"). URL-safe and never changes.
export const academicYears = sqliteTable("academic_years", {
  id: text().primaryKey(),
  startDate: text().notNull(),
  endDate: text().notNull(),
  isCurrent: bool().notNull().default(false),
  standardFeeCents: integer().notNull().default(0),
  ...timestamps,
});

export const terms = sqliteTable(
  "terms",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    academicYearId: text()
      .notNull()
      .references(() => academicYears.id),
    name: text().notNull(),
    startDate: text().notNull(),
    endDate: text().notNull(),
    ...timestamps,
  },
  (t) => [index("terms_year").on(t.academicYearId)],
);

// A recurring weekly slot ("Saturday 10:00") in an academic year. Classes belong to one.
export const schoolSessions = sqliteTable(
  "school_sessions",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    academicYearId: text()
      .notNull()
      .references(() => academicYears.id),
    name: text().notNull(),
    dayOfWeek: integer().notNull(),
    startTime: text().notNull(),
    isActive: bool().notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("school_sessions_year").on(t.academicYearId),
    check("school_sessions_day", sql`${t.dayOfWeek} between 0 and 6`),
  ],
);

// Natural key: the subject code ("quran").
export const subjects = sqliteTable("subjects", {
  id: text().primaryKey(),
  name: text().notNull(),
  isActive: bool().notNull().default(true),
  ...timestamps,
});

// One ordered entry in a session's schedule: a subject, or a titled slot such as "Break".
// Start and end times are computed from the session start, never stored.
export const sessionPeriods = sqliteTable(
  "session_periods",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    sessionId: integer()
      .notNull()
      .references(() => schoolSessions.id, { onDelete: "cascade" }),
    sortOrder: integer().notNull(),
    subjectId: text().references(() => subjects.id),
    title: text(),
    durationMinutes: integer().notNull(),
    ...timestamps,
  },
  (t) => [
    index("session_periods_session").on(t.sessionId),
    check("session_periods_one_of", sql`(${t.subjectId} is null) <> (${t.title} is null)`),
    check("session_periods_duration", sql`${t.durationMinutes} > 0`),
  ],
);

export const classes = sqliteTable(
  "classes",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    academicYearId: text()
      .notNull()
      .references(() => academicYears.id),
    sessionId: integer()
      .notNull()
      .references(() => schoolSessions.id),
    name: text().notNull(),
    classTeacherId: integer().references(() => teachers.id),
    room: text(),
    capacity: integer(),
    ...timestamps,
  },
  (t) => [index("classes_session").on(t.sessionId)],
);

// "Who teaches Arabic to Level 2". One row per subject in the session's schedule.
export const teachingAssignments = sqliteTable(
  "teaching_assignments",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    classId: integer()
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: text()
      .notNull()
      .references(() => subjects.id),
    teacherId: integer()
      .notNull()
      .references(() => teachers.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("teaching_assignments_class_subject").on(t.classId, t.subjectId),
    index("teaching_assignments_teacher").on(t.teacherId),
  ],
);
