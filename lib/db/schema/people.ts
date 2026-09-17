import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { bool, jsonList, timestamps } from "../columns";
import { users } from "./auth";

export const registrationReasons = [
  "arabic",
  "quran",
  "religion",
  "mosque",
  "community",
  "other",
] as const;
export type RegistrationReason = (typeof registrationReasons)[number];

export const guardianGenders = ["female", "male"] as const;
export type GuardianGender = (typeof guardianGenders)[number];

// Sensitive columns (ethnicity, spokenLanguages, registrationReasons*, address) are
// admin-only and never selected by teacher-facing queries (lib/db/queries).
export const guardians = sqliteTable(
  "guardians",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer()
      .notNull()
      .unique()
      .references(() => users.id),
    // Optional; it only decides whether "Mother" or "Father" is offered as the relationship.
    // No CHECK: adding one to an existing table means a rebuild, which D1 migrations can't
    // do while other tables reference it. The TypeScript union is the constraint.
    gender: text({ enum: guardianGenders }),
    addressLine1: text(),
    addressLine2: text(),
    city: text(),
    postalCode: text(),
    // Derived from the Eircode routing key ("D15"); used only by the postal-area report.
    area: text(),
    emergencyContactName: text(),
    emergencyContactPhone: text(),
    emergencyContactRelationship: text(),
    spokenLanguages: jsonList(),
    ethnicity: text(),
    registrationReasons: jsonList<RegistrationReason>(),
    registrationReasonOther: text(),
    ...timestamps,
  },
  (t) => [index("guardians_area").on(t.area)],
);

export const teachers = sqliteTable("teachers", {
  id: integer().primaryKey({ autoIncrement: true }),
  userId: integer()
    .notNull()
    .unique()
    .references(() => users.id),
  title: text(),
  isActive: bool().notNull().default(true),
  // When they stopped teaching; the list hides them from that day unless asked.
  deactivatedAt: text(),
  ...timestamps,
});
