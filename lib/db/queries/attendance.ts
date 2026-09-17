import { and, asc, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attendance,
  classes,
  enrolments,
  schoolSessions,
  sessionPeriods,
  students,
  users,
  type AttendanceStatus,
} from "@/lib/db/schema";
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

export type RegisterSummary = {
  classId: number;
  className: string;
  sessionName: string;
  startTime: string;
  endTime: string;
  studentCount: number;
  recordedCount: number;
  absentCount: number;
};

// Every class running on `date`'s weekday in the year, with how much of its register is in.
export async function listRegistersForDate(
  academicYearId: string,
  date: string,
  dayOfWeek: number,
  onlyClassIds?: number[],
): Promise<RegisterSummary[]> {
  const d = await db();
  const rows = await d
    .select({
      classId: classes.id,
      className: classes.name,
      sessionName: schoolSessions.name,
      startTime: schoolSessions.startTime,
      minutes: sql<number>`coalesce((select sum(${sessionPeriods.durationMinutes}) from ${sessionPeriods} where ${sessionPeriods.sessionId} = ${schoolSessions.id}), 0)`,
    })
    .from(classes)
    .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .where(
      and(
        eq(classes.academicYearId, academicYearId),
        eq(schoolSessions.dayOfWeek, dayOfWeek),
        eq(schoolSessions.isActive, true),
        onlyClassIds ? inArray(classes.id, onlyClassIds.length ? onlyClassIds : [-1]) : undefined,
      ),
    )
    .orderBy(asc(schoolSessions.startTime), asc(classes.name));
  if (!rows.length) return [];
  const classIds = rows.map((r) => r.classId);
  const [enrolled, recorded] = await Promise.all([
    d
      .select({ classId: enrolments.classId })
      .from(enrolments)
      .where(and(inArray(enrolments.classId, classIds), eq(enrolments.status, "active"))),
    d
      .select({ classId: attendance.classId, status: attendance.status })
      .from(attendance)
      .where(and(inArray(attendance.classId, classIds), eq(attendance.date, date))),
  ]);
  return rows.map(({ minutes, ...r }) => ({
    ...r,
    endTime: addMinutes(r.startTime, minutes),
    studentCount: enrolled.filter((e) => e.classId === r.classId).length,
    recordedCount: recorded.filter((a) => a.classId === r.classId).length,
    absentCount: recorded.filter((a) => a.classId === r.classId && a.status === "absent").length,
  }));
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

// How many rows each register of a class has, by date, for the dates given.
export async function countRegisterRows(
  classId: number,
  dates: string[],
): Promise<Map<string, number>> {
  if (!dates.length) return new Map();
  const rows = await (
    await db()
  )
    .select({ date: attendance.date, n: count() })
    .from(attendance)
    .where(and(eq(attendance.classId, classId), inArray(attendance.date, dates)))
    .groupBy(attendance.date);
  return new Map(rows.map((r) => [r.date, r.n]));
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
