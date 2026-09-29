import { and, asc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  classes,
  enrolments,
  schoolSessions,
  sessionPeriods,
  teachingAssignments,
  terms,
} from "@/lib/db/schema";
import type { CalendarTerm, LessonDay } from "@/lib/calendar";
import { familyStart, forFamilies, sessionEndTime } from "@/lib/timetable";
import type { ViewerScope } from "./events";

// The hours a session runs, for whoever is asking: staff see the whole day including the
// slots before the children arrive, a family sees the day their child is there
// (lib/timetable.ts, DESIGN §4.10).
async function hoursOf(
  sessions: { id: number; name: string; dayOfWeek: number; startTime: string }[],
  who: "staff" | "family",
  label: (session: { id: number; name: string }) => string = (session) => `${session.name} class`,
): Promise<LessonDay[]> {
  if (!sessions.length) return [];
  const periods = await (
    await db()
  )
    .select()
    .from(sessionPeriods)
    .where(
      inArray(
        sessionPeriods.sessionId,
        sessions.map((s) => s.id),
      ),
    )
    .orderBy(asc(sessionPeriods.sortOrder));
  return sessions.map((session) => {
    const mine = periods.filter((p) => p.sessionId === session.id);
    const shown = who === "staff" ? mine : forFamilies(mine);
    const startTime = who === "staff" ? session.startTime : familyStart(session.startTime, mine);
    return {
      sessionId: session.id,
      dayOfWeek: session.dayOfWeek,
      label: label(session),
      startTime,
      endTime: sessionEndTime(startTime, shown),
    };
  });
}

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
  const columns = {
    id: schoolSessions.id,
    dayOfWeek: schoolSessions.dayOfWeek,
    name: schoolSessions.name,
    startTime: schoolSessions.startTime,
  };
  const rows = await d
    .selectDistinct(columns)
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
    .selectDistinct(columns)
    .from(classes)
    .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .where(and(eq(classes.academicYearId, academicYearId), eq(classes.classTeacherId, teacherId)));
  const all = [...rows, ...led];
  return hoursOf(
    all.filter((r, i) => all.findIndex((o) => o.id === r.id) === i),
    "staff",
  );
}

// The weekday each of these students' classes meets, labelled with the children's names
// when there are several children.
export async function lessonDaysForStudents(
  students: { id: number; firstName: string }[],
): Promise<LessonDay[]> {
  if (!students.length) return [];
  const rows = await (
    await db()
  )
    .select({
      studentId: enrolments.studentId,
      id: schoolSessions.id,
      dayOfWeek: schoolSessions.dayOfWeek,
      name: schoolSessions.name,
      startTime: schoolSessions.startTime,
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
  // Siblings usually share a session: one chip per session naming whoever is in it, rather
  // than the same day at the same time repeated once per child.
  const names = new Map<number, string[]>();
  for (const row of rows) {
    const first = students.find((s) => s.id === row.studentId)?.firstName;
    const theirs = names.get(row.id) ?? [];
    if (first && !theirs.includes(first)) theirs.push(first);
    names.set(row.id, theirs);
  }
  const unique = rows.filter((r, i) => rows.findIndex((o) => o.id === r.id) === i);
  return hoursOf(unique, "family", (session) => {
    const theirs = names.get(session.id) ?? [];
    return students.length > 1 && theirs.length
      ? `${theirs.join(" & ")}: ${session.name}`
      : `${session.name} class`;
  });
}

// Every day the school runs, for the office's calendar.
export async function lessonDaysForSchool(academicYearId: string): Promise<LessonDay[]> {
  const rows = await (
    await db()
  )
    .selectDistinct({
      id: schoolSessions.id,
      dayOfWeek: schoolSessions.dayOfWeek,
      name: schoolSessions.name,
      startTime: schoolSessions.startTime,
    })
    .from(schoolSessions)
    .where(
      and(eq(schoolSessions.academicYearId, academicYearId), eq(schoolSessions.isActive, true)),
    );
  return hoursOf(rows, "staff");
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
    staff: true,
  };
}
