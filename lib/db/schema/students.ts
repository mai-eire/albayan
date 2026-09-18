import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { bool, timestamps } from "../columns";
import { classes, schoolSessions } from "./academics";
import { users } from "./auth";
import { guardians } from "./people";

export const genders = ["male", "female"] as const;
export const arabicProficiencies = [
  "none",
  "beginner",
  "intermediate",
  "advanced",
  "native",
] as const;
export const studentStatuses = ["applied", "active", "inactive", "declined"] as const;
export const relationships = ["mother", "father", "guardian", "grandparent", "other"] as const;
export const enrolmentStatuses = ["active", "left"] as const;

export type Gender = (typeof genders)[number];
export type ArabicProficiency = (typeof arabicProficiencies)[number];
export type StudentStatus = (typeof studentStatuses)[number];
export type Relationship = (typeof relationships)[number];
export type EnrolmentStatus = (typeof enrolmentStatuses)[number];

// An application is a student with status "applied" plus the preferred* columns.
// studentId (ALB-26-0042) is assigned on approval; age is computed from dateOfBirth.
export const students = sqliteTable(
  "students",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    studentId: text().unique(),
    userId: integer()
      .unique()
      .references(() => users.id),
    firstName: text().notNull(),
    lastName: text().notNull(),
    gender: text({ enum: genders }).notNull(),
    dateOfBirth: text().notNull(),
    ethnicity: text(),
    schoolYearGroup: text(),
    arabicProficiency: text({ enum: arabicProficiencies }).notNull().default("none"),
    email: text(),
    phone: text(),
    allergies: text(),
    medicalNotes: text(),
    status: text({ enum: studentStatuses }).notNull().default("applied"),
    preferredSessionId: integer().references(() => schoolSessions.id),
    preferredClassId: integer().references(() => classes.id),
    applicationNotes: text(),
    // The office's word to the family when the place offered isn't the one they asked for.
    offerNote: text(),
    declinedReason: text(),
    appliedAt: text().notNull(),
    approvedAt: text(),
    createdByGuardianId: integer()
      .notNull()
      .references(() => guardians.id),
    ...timestamps,
  },
  (t) => [
    index("students_status").on(t.status),
    check("students_gender", sql`${t.gender} in ('male', 'female')`),
    check(
      "students_arabic",
      sql`${t.arabicProficiency} in ('none', 'beginner', 'intermediate', 'advanced', 'native')`,
    ),
    check(
      "students_status_check",
      sql`${t.status} in ('applied', 'active', 'inactive', 'declined')`,
    ),
  ],
);

export const studentGuardians = sqliteTable(
  "student_guardians",
  {
    studentId: integer()
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    guardianId: integer()
      .notNull()
      .references(() => guardians.id),
    relationship: text({ enum: relationships }).notNull(),
    isPrimaryContact: bool().notNull().default(false),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.studentId, t.guardianId] }),
    index("student_guardians_guardian").on(t.guardianId),
    check(
      "student_guardians_relationship",
      sql`${t.relationship} in ('mother', 'father', 'guardian', 'grandparent', 'other')`,
    ),
  ],
);

// A student in a class for a year, carrying the agreed annual fee. History is kept;
// only one enrolment per student may be active.
export const enrolments = sqliteTable(
  "enrolments",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    studentId: integer()
      .notNull()
      .references(() => students.id),
    classId: integer()
      .notNull()
      .references(() => classes.id),
    startDate: text().notNull(),
    endDate: text(),
    status: text({ enum: enrolmentStatuses }).notNull().default("active"),
    feeCents: integer().notNull(),
    feeNote: text(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("enrolments_one_active")
      .on(t.studentId)
      .where(sql`${t.status} = 'active'`),
    index("enrolments_class").on(t.classId),
    check("enrolments_status", sql`${t.status} in ('active', 'left')`),
    check("enrolments_fee", sql`${t.feeCents} >= 0`),
  ],
);
