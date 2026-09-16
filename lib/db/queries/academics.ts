import { asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  academicYears,
  classes,
  schoolSessions,
  sessionPeriods,
  subjects,
  terms,
} from "@/lib/db/schema";

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

export type SessionRow = typeof schoolSessions.$inferSelect & {
  periods: (typeof sessionPeriods.$inferSelect)[];
  classCount: number;
};

export async function listSessions(academicYearId: string): Promise<SessionRow[]> {
  const d = await db();
  const rows = await d
    .select({ session: schoolSessions, classCount: count(classes.id) })
    .from(schoolSessions)
    .leftJoin(classes, eq(classes.sessionId, schoolSessions.id))
    .where(eq(schoolSessions.academicYearId, academicYearId))
    .groupBy(schoolSessions.id)
    .orderBy(asc(schoolSessions.dayOfWeek), asc(schoolSessions.startTime));
  if (!rows.length) return [];
  const periods = await d
    .select()
    .from(sessionPeriods)
    .where(
      inArray(
        sessionPeriods.sessionId,
        rows.map((r) => r.session.id),
      ),
    )
    .orderBy(asc(sessionPeriods.sortOrder));
  return rows.map((r) => ({
    ...r.session,
    classCount: r.classCount,
    periods: periods.filter((p) => p.sessionId === r.session.id),
  }));
}

export async function getSession(id: number): Promise<SessionRow | null> {
  const d = await db();
  const session = await d.query.schoolSessions.findFirst({ where: eq(schoolSessions.id, id) });
  if (!session) return null;
  const [periods, [{ classCount }]] = await Promise.all([
    d
      .select()
      .from(sessionPeriods)
      .where(eq(sessionPeriods.sessionId, id))
      .orderBy(asc(sessionPeriods.sortOrder)),
    d.select({ classCount: count() }).from(classes).where(eq(classes.sessionId, id)),
  ]);
  return { ...session, periods, classCount };
}
