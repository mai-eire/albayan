import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { bool, timestamps } from "../columns";
import { classes, subjects } from "./academics";
import { users } from "./auth";
import { students } from "./students";

export const attendanceStatuses = ["present", "absent", "late", "excused"] as const;
export const noteCategories = ["general", "praise", "concern", "behaviour"] as const;
export const noteVisibilities = ["staff", "guardians", "guardians_and_student"] as const;
export const resourceKinds = ["file", "link"] as const;
export const resourceAudiences = [
  "students_and_guardians",
  "guardians_only",
  "staff_only",
] as const;

export type AttendanceStatus = (typeof attendanceStatuses)[number];
export type NoteCategory = (typeof noteCategories)[number];
export type NoteVisibility = (typeof noteVisibilities)[number];
export type ResourceKind = (typeof resourceKinds)[number];
export type ResourceAudience = (typeof resourceAudiences)[number];

// One row per student per school day (PLAN §2): the register is the set of rows for a
// class on a date. Same-day edits by the teacher, admin-only afterwards (lib/access.ts).
export const attendance = sqliteTable(
  "attendance",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    studentId: integer()
      .notNull()
      .references(() => students.id),
    classId: integer()
      .notNull()
      .references(() => classes.id),
    date: text().notNull(),
    status: text({ enum: attendanceStatuses }).notNull().default("present"),
    note: text(),
    recordedByUserId: integer()
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("attendance_student_date").on(t.studentId, t.date),
    index("attendance_class_date").on(t.classId, t.date),
    check("attendance_status", sql`${t.status} in ('present', 'absent', 'late', 'excused')`),
  ],
);

// Set on (class, subject); reaches students through their class. Unpublished = draft.
export const homework = sqliteTable(
  "homework",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    classId: integer()
      .notNull()
      .references(() => classes.id),
    subjectId: text()
      .notNull()
      .references(() => subjects.id),
    title: text().notNull(),
    description: text(),
    dueDate: text().notNull(),
    createdByUserId: integer()
      .notNull()
      .references(() => users.id),
    publishedAt: text(),
    ...timestamps,
  },
  (t) => [index("homework_class_due").on(t.classId, t.dueDate)],
);

export const studentNotes = sqliteTable(
  "student_notes",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    studentId: integer()
      .notNull()
      .references(() => students.id),
    authorUserId: integer()
      .notNull()
      .references(() => users.id),
    body: text().notNull(),
    category: text({ enum: noteCategories }).notNull().default("general"),
    visibility: text({ enum: noteVisibilities }).notNull().default("staff"),
    deletedAt: text(),
    ...timestamps,
  },
  (t) => [
    index("student_notes_student").on(t.studentId),
    check(
      "student_notes_category",
      sql`${t.category} in ('general', 'praise', 'concern', 'behaviour')`,
    ),
    check(
      "student_notes_visibility",
      sql`${t.visibility} in ('staff', 'guardians', 'guardians_and_student')`,
    ),
  ],
);

// A file in R2 (storageKey) or a link, attached to exactly one target: the whole school,
// a class (optionally one subject), a homework, or a student.
export const resources = sqliteTable(
  "resources",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    description: text(),
    kind: text({ enum: resourceKinds }).notNull(),
    storageKey: text(),
    mimeType: text(),
    sizeBytes: integer(),
    url: text(),
    uploadedByUserId: integer()
      .notNull()
      .references(() => users.id),
    audience: text({ enum: resourceAudiences }).notNull().default("students_and_guardians"),
    isSchoolWide: bool().notNull().default(false),
    classId: integer().references(() => classes.id),
    subjectId: text().references(() => subjects.id),
    homeworkId: integer().references(() => homework.id),
    studentId: integer().references(() => students.id),
    ...timestamps,
  },
  (t) => [
    index("resources_class").on(t.classId),
    index("resources_homework").on(t.homeworkId),
    index("resources_student").on(t.studentId),
    check("resources_kind", sql`${t.kind} in ('file', 'link')`),
    check(
      "resources_audience",
      sql`${t.audience} in ('students_and_guardians', 'guardians_only', 'staff_only')`,
    ),
    // A file has a storage key, a link has a url.
    check(
      "resources_kind_fields",
      sql`(${t.kind} = 'file' and ${t.storageKey} is not null and ${t.url} is null) or (${t.kind} = 'link' and ${t.url} is not null and ${t.storageKey} is null)`,
    ),
    // Exactly one target; a subject only makes sense with a class.
    check(
      "resources_one_target",
      sql`(${t.isSchoolWide}) + (${t.classId} is not null) + (${t.homeworkId} is not null) + (${t.studentId} is not null) = 1 and (${t.subjectId} is null or ${t.classId} is not null)`,
    ),
  ],
);
