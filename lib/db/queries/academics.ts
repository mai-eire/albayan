import { and, asc, count, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import {
  academicYears,
  classes,
  enrolments,
  schoolSessions,
  sessionPeriods,
  students,
  subjects,
  teachers,
  teachingAssignments,
  terms,
  users,
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

// Monday-first, so the school's weekend reads Saturday then Sunday.
const weekOrder = sql`(${schoolSessions.dayOfWeek} + 6) % 7`;

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
    .orderBy(weekOrder, asc(schoolSessions.startTime));
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

export type TeacherOption = { id: number; name: string; isActive: boolean };

export async function listTeachers(): Promise<TeacherOption[]> {
  const d = await db();
  return d
    .select({ id: teachers.id, name: users.name, isActive: teachers.isActive })
    .from(teachers)
    .innerJoin(users, eq(users.id, teachers.userId))
    .orderBy(asc(users.name));
}

export type ClassRow = typeof classes.$inferSelect & {
  sessionName: string;
  classTeacherName: string | null;
  studentCount: number;
  // Children who asked for this class and are still waiting for a decision.
  applicationCount: number;
  // The class teacher and every subject teacher, for filtering the list by teacher.
  teacherIds: number[];
};

export async function listClasses(academicYearId: string): Promise<ClassRow[]> {
  const d = await db();
  const classTeacher = alias(teachers, "class_teacher");
  const classTeacherUser = alias(users, "class_teacher_user");
  const rows = await d
    .select({
      cls: classes,
      sessionName: schoolSessions.name,
      sessionDay: schoolSessions.dayOfWeek,
      classTeacherName: classTeacherUser.name,
      studentCount: count(enrolments.id),
      applicationCount: sql<number>`(select count(*) from ${students} where ${students.preferredClassId} = ${classes.id} and ${students.status} = 'applied')`,
    })
    .from(classes)
    .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .leftJoin(classTeacher, eq(classTeacher.id, classes.classTeacherId))
    .leftJoin(classTeacherUser, eq(classTeacherUser.id, classTeacher.userId))
    .leftJoin(enrolments, and(eq(enrolments.classId, classes.id), eq(enrolments.status, "active")))
    .where(eq(classes.academicYearId, academicYearId))
    .groupBy(classes.id)
    .orderBy(weekOrder, asc(schoolSessions.startTime), asc(classes.name));
  const assigned = rows.length
    ? await d
        .select({ classId: teachingAssignments.classId, teacherId: teachingAssignments.teacherId })
        .from(teachingAssignments)
        .where(
          inArray(
            teachingAssignments.classId,
            rows.map((r) => r.cls.id),
          ),
        )
    : [];
  return rows.map((r) => ({
    ...r.cls,
    sessionName: r.sessionName,
    classTeacherName: r.classTeacherName,
    studentCount: r.studentCount,
    applicationCount: r.applicationCount,
    teacherIds: [
      ...new Set(
        [
          r.cls.classTeacherId,
          ...assigned.filter((a) => a.classId === r.cls.id).map((a) => a.teacherId),
        ].filter((id): id is number => id !== null),
      ),
    ],
  }));
}

export type ClassDetail = typeof classes.$inferSelect & {
  session: typeof schoolSessions.$inferSelect;
  // The class teacher as a person, for the header (the staff page is keyed by user id).
  classTeacher: { userId: number; name: string } | null;
  periods: (typeof sessionPeriods.$inferSelect & { subjectName: string | null })[];
  assignments: { subjectId: string; teacherId: number }[];
  // Same teacher, same subject, another class in this session: they'd be in two rooms at once.
  clashes: { subjectId: string; teacherId: number; className: string }[];
  studentCount: number;
};

export async function getClass(id: number): Promise<ClassDetail | null> {
  const d = await db();
  const cls = await d.query.classes.findFirst({ where: eq(classes.id, id) });
  if (!cls) return null;
  const session = await d.query.schoolSessions.findFirst({
    where: eq(schoolSessions.id, cls.sessionId),
  });
  if (!session) return null;
  const [periods, assignments, siblings, [{ studentCount }], [classTeacher]] = await Promise.all([
    d
      .select({ period: sessionPeriods, subjectName: subjects.name })
      .from(sessionPeriods)
      .leftJoin(subjects, eq(subjects.id, sessionPeriods.subjectId))
      .where(eq(sessionPeriods.sessionId, session.id))
      .orderBy(asc(sessionPeriods.sortOrder)),
    d
      .select({
        subjectId: teachingAssignments.subjectId,
        teacherId: teachingAssignments.teacherId,
      })
      .from(teachingAssignments)
      .where(eq(teachingAssignments.classId, id)),
    d
      .select({
        subjectId: teachingAssignments.subjectId,
        teacherId: teachingAssignments.teacherId,
        className: classes.name,
      })
      .from(teachingAssignments)
      .innerJoin(classes, eq(classes.id, teachingAssignments.classId))
      .where(and(eq(classes.sessionId, session.id), ne(classes.id, id))),
    d
      .select({ studentCount: count() })
      .from(enrolments)
      .where(and(eq(enrolments.classId, id), eq(enrolments.status, "active"))),
    cls.classTeacherId === null
      ? Promise.resolve([])
      : d
          .select({ userId: users.id, name: users.name })
          .from(teachers)
          .innerJoin(users, eq(users.id, teachers.userId))
          .where(eq(teachers.id, cls.classTeacherId)),
  ]);
  return {
    ...cls,
    session,
    classTeacher: classTeacher ?? null,
    periods: periods.map((p) => ({ ...p.period, subjectName: p.subjectName })),
    assignments,
    clashes: siblings.filter((s) =>
      assignments.some((a) => a.subjectId === s.subjectId && a.teacherId === s.teacherId),
    ),
    studentCount,
  };
}

// The term containing `date`, or the whole year when it falls outside every term.
export async function currentPeriod(
  date: string,
): Promise<{ label: string; from: string; to: string } | null> {
  const year = await getCurrentYear();
  if (!year) return null;
  const term = await (
    await db()
  ).query.terms.findFirst({
    where: and(
      eq(terms.academicYearId, year.id),
      lte(terms.startDate, date),
      gte(terms.endDate, date),
    ),
  });
  return term
    ? { label: term.name, from: term.startDate, to: term.endDate }
    : { label: year.id, from: year.startDate, to: year.endDate };
}

export type RosterForAdmin = {
  enrolmentId: number;
  studentId: number;
  studentCode: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  feeCents: number;
};

// Who is in a class right now, with the enrolment the admin would move.
export async function listRosterForAdmin(classId: number): Promise<RosterForAdmin[]> {
  return (await db())
    .select({
      enrolmentId: enrolments.id,
      studentId: students.id,
      studentCode: students.studentId,
      firstName: students.firstName,
      lastName: students.lastName,
      dateOfBirth: students.dateOfBirth,
      feeCents: enrolments.feeCents,
    })
    .from(enrolments)
    .innerJoin(students, eq(students.id, enrolments.studentId))
    .where(and(eq(enrolments.classId, classId), eq(enrolments.status, "active")))
    .orderBy(asc(students.firstName), asc(students.lastName));
}

// The shape the offer and move modals pick from (app/admin/academics/classes/ClassPicker).
export function classChoice(c: ClassRow) {
  return {
    id: c.id,
    name: c.name,
    sessionId: c.sessionId,
    sessionName: c.sessionName,
    classTeacherName: c.classTeacherName,
    studentCount: c.studentCount,
    capacity: c.capacity,
    applicationCount: c.applicationCount,
  };
}
