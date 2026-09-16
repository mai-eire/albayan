import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { bool, isoDate, nowIso } from "../columns";

export const userStatuses = ["active", "invited", "disabled"] as const;
export type UserStatus = (typeof userStatuses)[number];

// Better Auth's user table plus our columns. Roles are derived (users.isAdmin + the
// existence of a guardians/teachers/students row); there is no roles table.
export const users = sqliteTable(
  "users",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: bool().notNull().default(false),
    image: text(),
    username: text().unique(),
    displayUsername: text(),
    phone: text(),
    isAdmin: bool().notNull().default(false),
    status: text({ enum: userStatuses }).notNull().default("active"),
    mustChangePassword: bool().notNull().default(false),
    // Off = in-app notifications only; the notify() helper checks it before emailing.
    emailNotifications: bool().notNull().default(true),
    lastLoginAt: text(),
    createdAt: isoDate().notNull().default(nowIso),
    updatedAt: isoDate().notNull().default(nowIso),
  },
  (t) => [check("users_status", sql`${t.status} in ('active', 'invited', 'disabled')`)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    expiresAt: isoDate().notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: isoDate().notNull().default(nowIso),
    updatedAt: isoDate().notNull().default(nowIso),
  },
  (t) => [index("sessions_user").on(t.userId)],
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: isoDate(),
    refreshTokenExpiresAt: isoDate(),
    scope: text(),
    password: text(),
    createdAt: isoDate().notNull().default(nowIso),
    updatedAt: isoDate().notNull().default(nowIso),
  },
  (t) => [index("accounts_user").on(t.userId)],
);

export const verifications = sqliteTable(
  "verifications",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: isoDate().notNull(),
    createdAt: isoDate().notNull().default(nowIso),
    updatedAt: isoDate().notNull().default(nowIso),
  },
  (t) => [index("verifications_identifier").on(t.identifier)],
);
