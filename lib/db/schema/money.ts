import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamps } from "../columns";
import { users } from "./auth";
import { guardians } from "./people";
import { enrolments } from "./students";

export const paymentMethods = ["cash", "bank_transfer", "card"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

// A payment against one enrolment's annual fee. Balance = feeCents − Σ amountCents, derived
// in lib/fees.ts. Rows are edited and deleted in place by admin; every change is audited.
export const payments = sqliteTable(
  "payments",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    enrolmentId: integer()
      .notNull()
      .references(() => enrolments.id),
    amountCents: integer().notNull(),
    paidOn: text().notNull(),
    method: text({ enum: paymentMethods }).notNull(),
    reference: text(),
    paidByGuardianId: integer().references(() => guardians.id),
    recordedByUserId: integer()
      .notNull()
      .references(() => users.id),
    // Stripe later.
    providerRef: text(),
    note: text(),
    ...timestamps,
  },
  (t) => [
    index("payments_enrolment").on(t.enrolmentId),
    index("payments_guardian").on(t.paidByGuardianId),
    check("payments_amount", sql`${t.amountCents} > 0`),
    check("payments_method", sql`${t.method} in ('cash', 'bank_transfer', 'card')`),
  ],
);
