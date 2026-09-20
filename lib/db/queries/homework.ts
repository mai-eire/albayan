import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  classes,
  enrolments,
  guardians,
  homework,
  schoolSessions,
  studentGuardians,
  students,
  subjects,
  teachingAssignments,
  users,
} from "@/lib/db/schema";

export type HomeworkRow = {
  id: number;
  classId: number;
  className: string;
  subjectId: string;
  subjectName: string;
  title: string;
  description: string | null;
  dueDate: string;
  publishedAt: string | null;
  createdByName: string;
};

const shape = {
  id: homework.id,
  classId: homework.classId,
  className: classes.name,
  subjectId: homework.subjectId,
  subjectName: subjects.name,
  title: homework.title,
  description: homework.description,
  dueDate: homework.dueDate,
  publishedAt: homework.publishedAt,
  createdByName: users.name,
};

// Homework on the (class, subject) pairs I teach this year, drafts included.
export async function listHomeworkForTeacher(
  teacherId: number,
  academicYearId: string,
): Promise<HomeworkRow[]> {
  const d = await db();
  const mine = await d
    .select({ classId: teachingAssignments.classId, subjectId: teachingAssignments.subjectId })
    .from(teachingAssignments)
    .innerJoin(classes, eq(classes.id, teachingAssignments.classId))
    .where(
      and(eq(teachingAssignments.teacherId, teacherId), eq(classes.academicYearId, academicYearId)),
    );
  if (!mine.length) return [];
  const rows = await d
    .select(shape)
    .from(homework)
    .innerJoin(classes, eq(classes.id, homework.classId))
    .innerJoin(subjects, eq(subjects.id, homework.subjectId))
    .innerJoin(users, eq(users.id, homework.createdByUserId))
    .where(
      inArray(
        homework.classId,
        mine.map((m) => m.classId),
      ),
    )
    .orderBy(desc(homework.dueDate), desc(homework.id));
  return rows.filter((r) =>
    mine.some((m) => m.classId === r.classId && m.subjectId === r.subjectId),
  );
}

export async function getHomework(id: number): Promise<HomeworkRow | null> {
  const [row] = await (
    await db()
  )
    .select(shape)
    .from(homework)
    .innerJoin(classes, eq(classes.id, homework.classId))
    .innerJoin(subjects, eq(subjects.id, homework.subjectId))
    .innerJoin(users, eq(users.id, homework.createdByUserId))
    .where(eq(homework.id, id));
  return row ?? null;
}

// Every homework on a class, drafts included, for the class page's Homework tab.
export async function listHomeworkForClass(classId: number): Promise<HomeworkRow[]> {
  return (await db())
    .select(shape)
    .from(homework)
    .innerJoin(classes, eq(classes.id, homework.classId))
    .innerJoin(subjects, eq(subjects.id, homework.subjectId))
    .innerJoin(users, eq(users.id, homework.createdByUserId))
    .where(eq(homework.classId, classId))
    .orderBy(desc(homework.dueDate), desc(homework.id));
}

// Published homework for a class, newest due first. Family and student pages use it
// through their own student queries.
export async function listPublishedHomeworkForClass(classId: number): Promise<HomeworkRow[]> {
  return (await db())
    .select(shape)
    .from(homework)
    .innerJoin(classes, eq(classes.id, homework.classId))
    .innerJoin(subjects, eq(subjects.id, homework.subjectId))
    .innerJoin(users, eq(users.id, homework.createdByUserId))
    .where(and(eq(homework.classId, classId), isNotNull(homework.publishedAt)))
    .orderBy(desc(homework.dueDate), desc(homework.id));
}

// The (class, subject) pairs a teacher may set homework for, for the form's selects.
export type HomeworkTarget = {
  classId: number;
  className: string;
  sessionName: string;
  // The class's lesson day, for "due next lesson".
  dayOfWeek: number;
  subjectId: string;
  subjectName: string;
};

export async function listHomeworkTargets(
  teacherId: number,
  academicYearId: string,
): Promise<HomeworkTarget[]> {
  return (await db())
    .select({
      classId: classes.id,
      className: classes.name,
      sessionName: schoolSessions.name,
      dayOfWeek: schoolSessions.dayOfWeek,
      subjectId: subjects.id,
      subjectName: subjects.name,
    })
    .from(teachingAssignments)
    .innerJoin(classes, eq(classes.id, teachingAssignments.classId))
    .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
    .where(
      and(eq(teachingAssignments.teacherId, teacherId), eq(classes.academicYearId, academicYearId)),
    )
    .orderBy(asc(schoolSessions.dayOfWeek), asc(classes.name), asc(subjects.name));
}

// Everyone to tell when homework is published: the class's students' guardians and the
// students who have a sign-in. Returned per student so hrefs can point at the child.
export async function listClassAudience(classId: number) {
  const d = await db();
  const enrolled = await d
    .select({ studentId: enrolments.studentId })
    .from(enrolments)
    .where(and(eq(enrolments.classId, classId), eq(enrolments.status, "active")));
  if (!enrolled.length) return [];
  const ids = enrolled.map((e) => e.studentId);
  const [guardianRows, studentRows] = await Promise.all([
    d
      .select({
        studentId: studentGuardians.studentId,
        userId: users.id,
        name: users.name,
        email: users.email,
      })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .innerJoin(users, eq(users.id, guardians.userId))
      .where(inArray(studentGuardians.studentId, ids)),
    d
      .select({ studentId: students.id, userId: users.id, name: users.name, email: users.email })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .where(inArray(students.id, ids)),
  ]);
  return [
    ...guardianRows.map((g) => ({ ...g, role: "guardian" as const })),
    ...studentRows.map((s) => ({ ...s, role: "student" as const })),
  ];
}
