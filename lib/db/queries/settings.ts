import { db } from "@/lib/db";
import { schoolSettings } from "@/lib/db/schema";

export type SchoolSettings = typeof schoolSettings.$inferSelect;

const defaults: SchoolSettings = {
  id: 1,
  name: "Al-Bayan",
  timezone: "Europe/Dublin",
  studentIdPrefix: "ALB",
  bankAccountName: null,
  bankIban: null,
  bankBic: null,
  absenceEmails: false,
  createdAt: "",
  updatedAt: "",
};

// The single settings row, with defaults until the school is set up.
export async function getSchoolSettings(): Promise<SchoolSettings> {
  const row = await (await db()).query.schoolSettings.findFirst();
  return row ?? defaults;
}
