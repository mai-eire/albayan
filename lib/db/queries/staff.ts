import { and, asc, desc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  classes,
  schoolSessions,
  sessionPeriods,
  sessions,
  studentNotes,
  students,
  subjects,
  teachers,
  teachingAssignments,
  users,
} from "@/lib/db/schema";
import { addMinutes } from "@/lib/timetable";

export type StaffRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  isAdmin: boolean;
  status: "active" | "invited" | "disabled";
  teacher: { id: number; isActive: boolean; deactivatedAt: string | null } | null;
  lastSignInAt: string | null;
};

// Everyone with an admin flag or a teacher row, whatever else they also are. Teachers who
// have stopped are included only when asked.
export async function listStaff(includeFormer = false): Promise<StaffRow[]> {
  const d = await db();
  const lastSignIn = d
    .select({ userId: sessions.userId, at: sql<string>`max(${sessions.createdAt})`.as("at") })
    .from(sessions)
    .groupBy(sessions.userId)
    .as("last_sign_in");
  const rows = await d
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      isAdmin: users.isAdmin,
      status: users.status,
      teacherId: teachers.id,
      teacherActive: teachers.isActive,
      deactivatedAt: teachers.deactivatedAt,
      lastSignInAt: lastSignIn.at,
    })
    .from(users)
    .leftJoin(teachers, eq(teachers.userId, users.id))
    .leftJoin(lastSignIn, eq(lastSignIn.userId, users.id))
    .where(
      and(
        or(eq(users.isAdmin, true), isNotNull(teachers.id)),
        includeFormer ? undefined : or(eq(users.isAdmin, true), eq(teachers.isActive, true)),
      ),
    )
    .orderBy(asc(users.name));
  return rows.map(({ teacherId, teacherActive, deactivatedAt, ...r }) => ({
    ...r,
    teacher:
      teacherId === null
        ? null
        : { id: teacherId, isActive: teacherActive ?? true, deactivatedAt: deactivatedAt ?? null },
  }));
}

export type StaffProfile = StaffRow & {
  createdAt: string;
  classes: {
    id: number;
    name: string;
    sessionName: string;
    startTime: string;
    endTime: string;
    isClassTeacher: boolean;
    subjects: string[];
  }[];
  notes: {
    id: number;
    studentId: number;
    studentName: string;
    body: string;
    category: string;
    createdAt: string;
  }[];
  noteCount: number;
};

// One staff member: their account, the classes they take this year and the notes they wrote.
export async function getStaffMember(
  userId: number,
  academicYearId: string | null,
): Promise<StaffProfile | null> {
  const [row] = (await listStaff(true)).filter((s) => s.id === userId);
  if (!row) return null;
  const d = await db();
  const user = await d.query.users.findFirst({
    columns: { createdAt: true },
    where: eq(users.id, userId),
  });
  const minutes = sql<number>`coalesce((select sum(${sessionPeriods.durationMinutes}) from ${sessionPeriods} where ${sessionPeriods.sessionId} = ${schoolSessions.id}), 0)`;
  const [taught, assigned, notes, [{ noteCount }]] = await Promise.all([
    row.teacher && academicYearId
      ? d
          .select({
            id: classes.id,
            name: classes.name,
            sessionName: schoolSessions.name,
            startTime: schoolSessions.startTime,
            minutes,
            classTeacherId: classes.classTeacherId,
          })
          .from(classes)
          .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
          .where(
            and(
              eq(classes.academicYearId, academicYearId),
              or(
                eq(classes.classTeacherId, row.teacher.id),
                sql`exists (select 1 from ${teachingAssignments} where ${teachingAssignments.classId} = ${classes.id} and ${teachingAssignments.teacherId} = ${row.teacher.id})`,
              ),
            ),
          )
          .orderBy(
            sql`(${schoolSessions.dayOfWeek} + 6) % 7`,
            asc(schoolSessions.startTime),
            asc(classes.name),
          )
      : [],
    row.teacher
      ? d
          .select({ classId: teachingAssignments.classId, subjectName: subjects.name })
          .from(teachingAssignments)
          .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
          .where(eq(teachingAssignments.teacherId, row.teacher.id))
      : [],
    d
      .select({
        id: studentNotes.id,
        studentId: students.id,
        studentName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
        body: studentNotes.body,
        category: studentNotes.category,
        createdAt: studentNotes.createdAt,
      })
      .from(studentNotes)
      .innerJoin(students, eq(students.id, studentNotes.studentId))
      .where(and(eq(studentNotes.authorUserId, userId), isNull(studentNotes.deletedAt)))
      .orderBy(desc(studentNotes.createdAt))
      .limit(10),
    d
      .select({ noteCount: sql<number>`count(*)` })
      .from(studentNotes)
      .where(and(eq(studentNotes.authorUserId, userId), isNull(studentNotes.deletedAt))),
  ]);
  return {
    ...row,
    createdAt: user ? new Date(user.createdAt).toISOString() : "",
    classes: taught.map(({ minutes: m, classTeacherId, ...c }) => ({
      ...c,
      endTime: addMinutes(c.startTime, m),
      isClassTeacher: classTeacherId === row.teacher?.id,
      subjects: assigned.filter((a) => a.classId === c.id).map((a) => a.subjectName),
    })),
    notes,
    noteCount,
  };
}
