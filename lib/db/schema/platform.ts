import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { bool, nowIso, timestamps } from "../columns";
import { subjects } from "./academics";
import { users } from "./auth";
import { students } from "./students";

// A single row (id = 1). School-level configuration; there is no key-value settings table.
export const schoolSettings = sqliteTable("school_settings", {
  id: integer().primaryKey(),
  name: text().notNull(),
  timezone: text().notNull().default("Europe/Dublin"),
  studentIdPrefix: text().notNull().default("ALB"),
  bankAccountName: text(),
  bankIban: text(),
  bankBic: text(),
  absenceEmails: bool().notNull().default(false),
  // Plain text, paragraphs separated by blank lines; shown to families, students and staff.
  rules: text(),
  ...timestamps,
});

export const notifications = sqliteTable(
  "notifications",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().notNull(),
    title: text().notNull(),
    body: text(),
    href: text(),
    // What the notification is about, when it is about one of those: the subject is shown
    // as a badge, the child by name, so a parent of three knows which one it concerns.
    subjectId: text().references(() => subjects.id),
    studentId: integer().references(() => students.id, { onDelete: "cascade" }),
    readAt: text(),
    ...timestamps,
  },
  (t) => [index("notifications_user").on(t.userId, t.readAt)],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    actorUserId: integer().references(() => users.id),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: text().notNull(),
    changes: text({ mode: "json" }).$type<Record<string, unknown>>(),
    ip: text(),
    createdAt: text().notNull().default(nowIso),
  },
  (t) => [index("audit_log_entity").on(t.entityType, t.entityId)],
);
