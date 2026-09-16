import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { classes, enrolments, schoolSessions, teachingAssignments, terms } from "@/lib/db/schema";
import type { CalendarTerm, LessonDay } from "@/lib/calendar";

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
  return rows.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    label:
      students.length > 1
        ? `${students.find((s) => s.id === r.studentId)?.firstName}: ${r.name}`
        : `${r.name} class`,
  }));
}
