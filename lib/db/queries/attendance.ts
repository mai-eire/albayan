import { and, asc, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import {
  attendance,
  classes,
  enrolments,
  schoolSessions,
  sessionPeriods,
  students,
  teachers,
  teachingAssignments,
  users,
  type AttendanceStatus,
} from "@/lib/db/schema";
import { lessonDatesBetween } from "@/lib/calendar";
import { currentPeriod } from "./academics";
import { addMinutes } from "@/lib/timetable";

export type RegisterRow = {
  studentId: number;
  firstName: string;
  lastName: string;
  status: AttendanceStatus | null;
  note: string | null;
};

export type Register = {
  classId: number;
  className: string;
  sessionName: string;
  date: string;
  rows: RegisterRow[];
  // Who last saved it; null until it is taken.
  takenBy: { name: string; at: string } | null;
};

// The class roster for a date with whatever was recorded. Names only: this is a
// teacher-facing shape.
export async function getRegister(classId: number, date: string): Promise<Register | null> {
  const d = await db();
  const [cls] = await d
    .select({ id: classes.id, name: classes.name, sessionName: schoolSessions.name })
    .from(classes)
    .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .where(eq(classes.id, classId));
  if (!cls) return null;
  const roster = await d
    .select({ studentId: students.id, firstName: students.firstName, lastName: students.lastName })
    .from(enrolments)
    .innerJoin(students, eq(students.id, enrolments.studentId))
    .where(and(eq(enrolments.classId, classId), eq(enrolments.status, "active")))
    .orderBy(asc(students.firstName), asc(students.lastName));
  const recorded = roster.length
    ? await d
        .select({
          studentId: attendance.studentId,
          status: attendance.status,
          note: attendance.note,
          updatedAt: attendance.updatedAt,
          recordedBy: users.name,
        })
        .from(attendance)
        .innerJoin(users, eq(users.id, attendance.recordedByUserId))
        .where(
          and(
            eq(attendance.date, date),
            inArray(
              attendance.studentId,
              roster.map((r) => r.studentId),
            ),
          ),
        )
        .orderBy(asc(attendance.updatedAt))
    : [];
  const latest = recorded.at(-1);
  return {
    classId: cls.id,
    className: cls.name,
    sessionName: cls.sessionName,
    date,
    rows: roster.map((r) => {
      const row = recorded.find((a) => a.studentId === r.studentId);
      return { ...r, status: row?.status ?? null, note: row?.note ?? null };
    }),
    takenBy: latest ? { name: latest.recordedBy, at: latest.updatedAt } : null,
  };
}

export type AttendanceSummary = {
  studentId: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
};

// Per-student counts over a date range (a term, usually) for one class.
export async function summariseAttendance(
  classId: number,
  from: string,
  to: string,
): Promise<AttendanceSummary[]> {
  const d = await db();
  const rows = await d
    .select({ studentId: attendance.studentId, status: attendance.status })
    .from(attendance)
    .where(
      and(eq(attendance.classId, classId), gte(attendance.date, from), lte(attendance.date, to)),
    );
  const byStudent = new Map<number, AttendanceSummary>();
  for (const row of rows) {
    const s = byStudent.get(row.studentId) ?? {
      studentId: row.studentId,
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
    };
    s[row.status] += 1;
    byStudent.set(row.studentId, s);
  }
  return [...byStudent.values()];
}

// How many registers a class has actually had taken in a range — the "n" in "7 / 9".
export async function countRegistersTaken(
  classId: number,
  from: string,
  to: string,
): Promise<number> {
  const [row] = await (
    await db()
  )
    .select({ n: sql<number>`count(distinct ${attendance.date})` })
    .from(attendance)
    .where(
      and(eq(attendance.classId, classId), gte(attendance.date, from), lte(attendance.date, to)),
    );
  return row?.n ?? 0;
}

export type AttendanceEntry = {
  date: string;
  status: AttendanceStatus;
  note: string | null;
  sessionName: string;
};

// One student's recent attendance, newest first.
export async function listAttendanceForStudent(
  studentId: number,
  limit = 12,
): Promise<AttendanceEntry[]> {
  return (await db())
    .select({
      date: attendance.date,
      status: attendance.status,
      note: attendance.note,
      sessionName: schoolSessions.name,
    })
    .from(attendance)
    .innerJoin(classes, eq(classes.id, attendance.classId))
    .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .where(eq(attendance.studentId, studentId))
    .orderBy(desc(attendance.date))
    .limit(limit);
}

export type TermRegisterRow = {
  date: string;
  classId: number;
  className: string;
  sessionId: number;
  sessionName: string;
  startTime: string;
  endTime: string;
  teacherName: string | null;
  // The class teacher and every subject teacher: the term view filters by any of them.
  teacherIds: number[];
  studentCount: number;
  recordedCount: number;
  absentCount: number;
  excusedCount: number;
};

// Every lesson date × class in the range, newest first, with how much of each register is
// in. Lesson dates come from the session's weekday; counts from the attendance rows.
export async function listRegistersForTerm(
  academicYearId: string,
  from: string,
  to: string,
): Promise<TermRegisterRow[]> {
  const d = await db();
  const classTeacher = alias(teachers, "class_teacher");
  const classTeacherUser = alias(users, "class_teacher_user");
  const rows = await d
    .select({
      classId: classes.id,
      className: classes.name,
      sessionId: schoolSessions.id,
      sessionName: schoolSessions.name,
      dayOfWeek: schoolSessions.dayOfWeek,
      startTime: schoolSessions.startTime,
      minutes: sql<number>`coalesce((select sum(${sessionPeriods.durationMinutes}) from ${sessionPeriods} where ${sessionPeriods.sessionId} = ${schoolSessions.id}), 0)`,
      classTeacherId: classes.classTeacherId,
      teacherName: classTeacherUser.name,
    })
    .from(classes)
    .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .leftJoin(classTeacher, eq(classTeacher.id, classes.classTeacherId))
    .leftJoin(classTeacherUser, eq(classTeacherUser.id, classTeacher.userId))
    .where(and(eq(classes.academicYearId, academicYearId), eq(schoolSessions.isActive, true)))
    .orderBy(asc(schoolSessions.startTime), asc(classes.name));
  if (!rows.length) return [];
  const classIds = rows.map((r) => r.classId);
  const [enrolled, assigned, recorded] = await Promise.all([
    d
      .select({ classId: enrolments.classId, n: count() })
      .from(enrolments)
      .where(and(inArray(enrolments.classId, classIds), eq(enrolments.status, "active")))
      .groupBy(enrolments.classId),
    d
      .select({ classId: teachingAssignments.classId, teacherId: teachingAssignments.teacherId })
      .from(teachingAssignments)
      .where(inArray(teachingAssignments.classId, classIds)),
    d
      .select({
        classId: attendance.classId,
        date: attendance.date,
        n: count(),
        absent: sql<number>`sum(case when ${attendance.status} = 'absent' then 1 else 0 end)`,
        excused: sql<number>`sum(case when ${attendance.status} = 'excused' then 1 else 0 end)`,
      })
      .from(attendance)
      .where(
        and(
          inArray(attendance.classId, classIds),
          gte(attendance.date, from),
          lte(attendance.date, to),
        ),
      )
      .groupBy(attendance.classId, attendance.date),
  ]);
  const out: TermRegisterRow[] = [];
  for (const r of rows) {
    for (const date of lessonDatesBetween(r.dayOfWeek, from, to)) {
      const taken = recorded.find((a) => a.classId === r.classId && a.date === date);
      out.push({
        date,
        classId: r.classId,
        className: r.className,
        sessionId: r.sessionId,
        sessionName: r.sessionName,
        startTime: r.startTime,
        endTime: addMinutes(r.startTime, r.minutes),
        teacherName: r.teacherName,
        teacherIds: [
          ...new Set([
            ...(r.classTeacherId === null ? [] : [r.classTeacherId]),
            ...assigned.filter((a) => a.classId === r.classId).map((a) => a.teacherId),
          ]),
        ],
        studentCount: enrolled.find((e) => e.classId === r.classId)?.n ?? 0,
        recordedCount: taken?.n ?? 0,
        absentCount: taken?.absent ?? 0,
        excusedCount: taken?.excused ?? 0,
      });
    }
  }
  return out.sort((a, b) => (a.date === b.date ? 0 : a.date > b.date ? -1 : 1));
}

// How a class stands on registers this term: lessons so far and how many registers are
// not taken — the mark on a class's Attendance tab.
export async function registersStanding(
  academicYearId: string,
  classId: number,
  today: string,
): Promise<{ total: number; missing: number }> {
  const period = await currentPeriod(today);
  if (!period) return { total: 0, missing: 0 };
  const rows = (
    await listRegistersForTerm(academicYearId, period.from, period.to < today ? period.to : today)
  ).filter((r) => r.classId === classId && r.studentCount > 0);
  return {
    total: rows.length,
    missing: rows.filter((r) => r.recordedCount < r.studentCount).length,
  };
}
