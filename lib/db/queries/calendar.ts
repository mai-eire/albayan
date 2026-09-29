import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { classes, enrolments, schoolSessions, teachingAssignments, terms } from "@/lib/db/schema";
import type { CalendarTerm, LessonDay } from "@/lib/calendar";
import type { ViewerScope } from "./events";

export async function listTermsForYear(academicYearId: string): Promise<CalendarTerm[]> {
  return (await db())
    .select({ name: terms.name, startDate: terms.startDate, endDate: terms.endDate })
    .from(terms)
    .where(eq(terms.academicYearId, academicYearId));
}

// The weekdays a teacher is in: sessions of the classes they lead or teach in.
export async function lessonDaysForTeacher(
  teacherId: number,
  academicYearId: string,
): Promise<LessonDay[]> {
  const d = await db();
  const rows = await d
    .selectDistinct({ dayOfWeek: schoolSessions.dayOfWeek, name: schoolSessions.name })
    .from(classes)
    .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .where(
      and(
        eq(classes.academicYearId, academicYearId),
        eq(schoolSessions.isActive, true),
        inArray(
          classes.id,
          d
            .select({ id: teachingAssignments.classId })
            .from(teachingAssignments)
            .where(eq(teachingAssignments.teacherId, teacherId)),
        ),
      ),
    );
  const led = await d
    .selectDistinct({ dayOfWeek: schoolSessions.dayOfWeek, name: schoolSessions.name })
    .from(classes)
    .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .where(and(eq(classes.academicYearId, academicYearId), eq(classes.classTeacherId, teacherId)));
  const all = [...rows, ...led];
  return all
    .filter((r, i) => all.findIndex((o) => o.dayOfWeek === r.dayOfWeek) === i)
    .map((r) => ({ dayOfWeek: r.dayOfWeek, label: `${r.name} class` }));
}

// The weekday each of these students' classes meets, labelled with the child's name when
// there are several children.
export async function lessonDaysForStudents(
  students: { id: number; firstName: string }[],
): Promise<LessonDay[]> {
  if (!students.length) return [];
  const rows = await (
    await db()
  )
    .select({
      studentId: enrolments.studentId,
      dayOfWeek: schoolSessions.dayOfWeek,
      name: schoolSessions.name,
    })
    .from(enrolments)
    .innerJoin(classes, eq(classes.id, enrolments.classId))
    .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .where(
      and(
        inArray(
          enrolments.studentId,
          students.map((s) => s.id),
        ),
        eq(enrolments.status, "active"),
      ),
    );
  const labelled = rows.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    label:
      students.length > 1
        ? `${students.find((s) => s.id === r.studentId)?.firstName}: ${r.name}`
        : `${r.name} class`,
  }));
  // Two children with the same first name, or two classes on one day, would otherwise
  // repeat the same chip on every square of that weekday.
  return labelled.filter(
    (l, i) => labelled.findIndex((o) => o.dayOfWeek === l.dayOfWeek && o.label === l.label) === i,
  );
}

// Every day the school runs, for the office's calendar.
export async function lessonDaysForSchool(academicYearId: string): Promise<LessonDay[]> {
  const rows = await (
    await db()
  )
    .selectDistinct({ dayOfWeek: schoolSessions.dayOfWeek, name: schoolSessions.name })
    .from(schoolSessions)
    .where(
      and(eq(schoolSessions.academicYearId, academicYearId), eq(schoolSessions.isActive, true)),
    );
  return rows.map((r) => ({ dayOfWeek: r.dayOfWeek, label: `${r.name} class` }));
}

// The sessions and classes some children belong to: which of the school's dates are theirs.
export async function scopeForStudents(studentIds: number[]): Promise<ViewerScope> {
  if (!studentIds.length) return { sessionIds: [], classIds: [] };
  const rows = await (
    await db()
  )
    .select({ classId: classes.id, sessionId: classes.sessionId })
    .from(enrolments)
    .innerJoin(classes, eq(classes.id, enrolments.classId))
    .where(and(inArray(enrolments.studentId, studentIds), eq(enrolments.status, "active")));
  return {
    sessionIds: [...new Set(rows.map((r) => r.sessionId))],
    classIds: [...new Set(rows.map((r) => r.classId))],
  };
}

// The classes a teacher leads or teaches in, and their sessions.
export async function scopeForTeacher(
  teacherId: number,
  academicYearId: string,
): Promise<ViewerScope> {
  const d = await db();
  const rows = await d
    .selectDistinct({ classId: classes.id, sessionId: classes.sessionId })
    .from(classes)
    .where(
      and(
        eq(classes.academicYearId, academicYearId),
        or(
          eq(classes.classTeacherId, teacherId),
          inArray(
            classes.id,
            d
              .select({ id: teachingAssignments.classId })
              .from(teachingAssignments)
              .where(eq(teachingAssignments.teacherId, teacherId)),
          ),
        ),
      ),
    );
  return {
    sessionIds: [...new Set(rows.map((r) => r.sessionId))],
    classIds: [...new Set(rows.map((r) => r.classId))],
  };
}
