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

export type StaffClass = {
  id: number;
  name: string;
  sessionId: number;
  sessionName: string;
  startTime: string;
  endTime: string;
  isClassTeacher: boolean;
  subjectIds: string[];
  subjects: string[];
};

export type StaffRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  isAdmin: boolean;
  status: "active" | "invited" | "disabled";
  teacher: { id: number; isActive: boolean; deactivatedAt: string | null } | null;
  lastSignInAt: string | null;
  // The classes they take this year (class teacher or a subject), for the list's filters.
  classes: StaffClass[];
};

// Everyone with an admin flag or a teacher row, whatever else they also are, including
// former teachers; the list hides those in the browser unless asked.
export async function listStaff(academicYearId: string | null = null): Promise<StaffRow[]> {
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
    .where(or(eq(users.isAdmin, true), isNotNull(teachers.id)))
    .orderBy(asc(users.name));
  const taught = academicYearId ? await listClassesTaught(academicYearId) : [];
  return rows.map(({ teacherId, teacherActive, deactivatedAt, ...r }) => ({
    ...r,
    teacher:
      teacherId === null
        ? null
        : { id: teacherId, isActive: teacherActive ?? true, deactivatedAt: deactivatedAt ?? null },
    classes: teacherId === null ? [] : taught.filter((t) => t.teacherId === teacherId),
  }));
}

// Every (teacher, class) pair in a year: class teachers and subject teachers alike.
async function listClassesTaught(
  academicYearId: string,
): Promise<(StaffClass & { teacherId: number })[]> {
  const d = await db();
  const minutes = sql<number>`coalesce((select sum(${sessionPeriods.durationMinutes}) from ${sessionPeriods} where ${sessionPeriods.sessionId} = ${schoolSessions.id}), 0)`;
  const [rows, assigned] = await Promise.all([
    d
      .select({
        id: classes.id,
        name: classes.name,
        sessionId: schoolSessions.id,
        sessionName: schoolSessions.name,
        startTime: schoolSessions.startTime,
        minutes,
        classTeacherId: classes.classTeacherId,
      })
      .from(classes)
      .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
      .where(eq(classes.academicYearId, academicYearId))
      .orderBy(
        sql`(${schoolSessions.dayOfWeek} + 6) % 7`,
        asc(schoolSessions.startTime),
        asc(classes.name),
      ),
    d
      .select({
        classId: teachingAssignments.classId,
        teacherId: teachingAssignments.teacherId,
        subjectId: subjects.id,
        subjectName: subjects.name,
      })
      .from(teachingAssignments)
      .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
      .innerJoin(classes, eq(classes.id, teachingAssignments.classId))
      .where(eq(classes.academicYearId, academicYearId)),
  ]);
  const out: (StaffClass & { teacherId: number })[] = [];
  for (const { minutes: m, classTeacherId, ...c } of rows) {
    const teacherIds = new Set([
      ...(classTeacherId === null ? [] : [classTeacherId]),
      ...assigned.filter((a) => a.classId === c.id).map((a) => a.teacherId),
    ]);
    for (const teacherId of teacherIds) {
      const mine = assigned.filter((a) => a.classId === c.id && a.teacherId === teacherId);
      out.push({
        ...c,
        teacherId,
        endTime: addMinutes(c.startTime, m),
        isClassTeacher: classTeacherId === teacherId,
        subjectIds: mine.map((a) => a.subjectId),
        subjects: mine.map((a) => a.subjectName),
      });
    }
  }
  return out;
}

export type StaffProfile = StaffRow & {
  createdAt: string;
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
  const [row] = (await listStaff(academicYearId)).filter((s) => s.id === userId);
  if (!row) return null;
  const d = await db();
  const [user, notes, [{ noteCount }]] = await Promise.all([
    d.query.users.findFirst({ columns: { createdAt: true }, where: eq(users.id, userId) }),
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
      .limit(20),
    d
      .select({ noteCount: sql<number>`count(*)` })
      .from(studentNotes)
      .where(and(eq(studentNotes.authorUserId, userId), isNull(studentNotes.deletedAt))),
  ]);
  return {
    ...row,
    createdAt: user ? new Date(user.createdAt).toISOString() : "",
    notes,
    noteCount,
  };
}
