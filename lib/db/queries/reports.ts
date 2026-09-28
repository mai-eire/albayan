import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  classes,
  enrolments,
  guardians,
  schoolSessions,
  students,
  type RegistrationReason,
} from "@/lib/db/schema";
import type { ReportInput } from "@/lib/reports";

// Admin-only. The demographic columns live behind these walls (PLAN §6): nothing here is
// ever handed to a teacher, family or student query, and only counts leave the page.

// Every child with a place in the year, with the household answers of the guardian who
// registered them. Sessions come along so a day nobody comes on still shows as zero.
export async function reportData(academicYearId: string): Promise<ReportInput> {
  const d = await db();
  const [children, sessions] = await Promise.all([
    d
      .select({
        gender: students.gender,
        dateOfBirth: students.dateOfBirth,
        countryOfOrigin: students.countryOfOrigin,
        arabicProficiency: students.arabicProficiency,
        sessionName: schoolSessions.name,
        languages: guardians.spokenLanguages,
        area: guardians.area,
        reasons: guardians.registrationReasons,
      })
      .from(enrolments)
      .innerJoin(students, eq(students.id, enrolments.studentId))
      .innerJoin(classes, eq(classes.id, enrolments.classId))
      .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
      .innerJoin(guardians, eq(guardians.id, students.createdByGuardianId))
      .where(
        and(
          eq(classes.academicYearId, academicYearId),
          eq(enrolments.status, "active"),
          eq(students.status, "active"),
        ),
      ),
    d
      .select({ name: schoolSessions.name })
      .from(schoolSessions)
      .where(eq(schoolSessions.academicYearId, academicYearId))
      .orderBy(sql`(${schoolSessions.dayOfWeek} + 6) % 7`, asc(schoolSessions.startTime)),
  ]);
  return {
    children: children.map((c) => ({
      ...c,
      languages: c.languages ?? [],
      reasons: (c.reasons ?? []) as RegistrationReason[],
    })),
    sessions: sessions.map((s) => s.name),
  };
}
