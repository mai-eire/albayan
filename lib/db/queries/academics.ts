import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { academicYears, subjects, terms } from "@/lib/db/schema";

export type YearRow = typeof academicYears.$inferSelect & { termCount: number };
export type Term = typeof terms.$inferSelect;

export async function listYears(): Promise<YearRow[]> {
  const d = await db();
  const rows = await d
    .select({ year: academicYears, termCount: count(terms.id) })
    .from(academicYears)
    .leftJoin(terms, eq(terms.academicYearId, academicYears.id))
    .groupBy(academicYears.id)
    .orderBy(desc(academicYears.startDate));
  return rows.map((r) => ({ ...r.year, termCount: r.termCount }));
}

export async function getYear(id: string) {
  const d = await db();
  const year = await d.query.academicYears.findFirst({ where: eq(academicYears.id, id) });
  if (!year) return null;
  const yearTerms = await d
    .select()
    .from(terms)
    .where(eq(terms.academicYearId, id))
    .orderBy(asc(terms.startDate));
  return { ...year, terms: yearTerms };
}

export async function getCurrentYear() {
  return (await db()).query.academicYears.findFirst({ where: eq(academicYears.isCurrent, true) });
}

export type Subject = typeof subjects.$inferSelect;

export async function listSubjects(): Promise<Subject[]> {
  return (await db()).select().from(subjects).orderBy(desc(subjects.isActive), asc(subjects.name));
}
