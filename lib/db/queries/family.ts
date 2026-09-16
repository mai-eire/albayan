import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import {
  classes,
  enrolments,
  schoolSessions,
  sessionPeriods,
  students,
  subjects,
  teachers,
  teachingAssignments,
  users,
} from "@/lib/db/schema";

// Guardian- and student-facing shapes. Guardians see their child's health notes and fee;
// students see only their own timetable. Neither touches the guardians table's sensitive
// columns (those are the guardian's own, on /family/account) or any other family.

export type Place = {
  className: string;
  room: string | null;
  sessionName: string;
  dayOfWeek: number;
  startTime: string;
  classTeacherName: string | null;
  periods: {
    subjectId: string | null;
    subjectName: string | null;
    title: string | null;
    durationMinutes: number;
    teacherName: string | null;
  }[];
};

// The class the student's active enrolment puts them in, with its day's timetable.
async function loadPlace(
  studentId: number,
): Promise<{ place: Place; enrolmentId: number; feeCents: number; feeNote: string | null } | null> {
  const d = await db();
  const classTeacher = alias(teachers, "class_teacher");
  const classTeacherUser = alias(users, "class_teacher_user");
  const [row] = await d
    .select({
      enrolmentId: enrolments.id,
      feeCents: enrolments.feeCents,
      feeNote: enrolments.feeNote,
      classId: classes.id,
      className: classes.name,
      room: classes.room,
      sessionId: schoolSessions.id,
      sessionName: schoolSessions.name,
      dayOfWeek: schoolSessions.dayOfWeek,
      startTime: schoolSessions.startTime,
      classTeacherName: classTeacherUser.name,
    })
    .from(enrolments)
    .innerJoin(classes, eq(classes.id, enrolments.classId))
    .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .leftJoin(classTeacher, eq(classTeacher.id, classes.classTeacherId))
    .leftJoin(classTeacherUser, eq(classTeacherUser.id, classTeacher.userId))
    .where(and(eq(enrolments.studentId, studentId), eq(enrolments.status, "active")));
  if (!row) return null;
  const [periods, assignments] = await Promise.all([
    d
      .select({
        subjectId: sessionPeriods.subjectId,
        subjectName: subjects.name,
        title: sessionPeriods.title,
        durationMinutes: sessionPeriods.durationMinutes,
      })
      .from(sessionPeriods)
      .leftJoin(subjects, eq(subjects.id, sessionPeriods.subjectId))
      .where(eq(sessionPeriods.sessionId, row.sessionId))
      .orderBy(asc(sessionPeriods.sortOrder)),
    d
      .select({ subjectId: teachingAssignments.subjectId, teacherName: users.name })
      .from(teachingAssignments)
      .innerJoin(teachers, eq(teachers.id, teachingAssignments.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(eq(teachingAssignments.classId, row.classId)),
  ]);
  return {
    enrolmentId: row.enrolmentId,
    feeCents: row.feeCents,
    feeNote: row.feeNote,
    place: {
      className: row.className,
      room: row.room,
      sessionName: row.sessionName,
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      classTeacherName: row.classTeacherName,
      periods: periods.map((p) => ({
        ...p,
        teacherName: assignments.find((a) => a.subjectId === p.subjectId)?.teacherName ?? null,
      })),
    },
  };
}

type Student = typeof students.$inferSelect;

export type StudentForGuardian = {
  id: number;
  studentId: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Student["gender"];
  schoolYearGroup: string | null;
  arabicProficiency: Student["arabicProficiency"];
  allergies: string | null;
  medicalNotes: string | null;
  status: Student["status"];
  preferredSessionName: string | null;
  declinedReason: string | null;
  place: Place | null;
  fee: { cents: number; note: string | null } | null;
};

export async function getStudentForGuardian(id: number): Promise<StudentForGuardian | null> {
  const d = await db();
  const [student] = await d
    .select({
      id: students.id,
      studentId: students.studentId,
      firstName: students.firstName,
      lastName: students.lastName,
      dateOfBirth: students.dateOfBirth,
      gender: students.gender,
      schoolYearGroup: students.schoolYearGroup,
      arabicProficiency: students.arabicProficiency,
      allergies: students.allergies,
      medicalNotes: students.medicalNotes,
      status: students.status,
      declinedReason: students.declinedReason,
      preferredSessionName: schoolSessions.name,
    })
    .from(students)
    .leftJoin(schoolSessions, eq(schoolSessions.id, students.preferredSessionId))
    .where(eq(students.id, id));
  if (!student) return null;
  const placed = await loadPlace(id);
  return {
    ...student,
    place: placed?.place ?? null,
    fee: placed ? { cents: placed.feeCents, note: placed.feeNote } : null,
  };
}

export type StudentForStudent = {
  id: number;
  studentId: string | null;
  firstName: string;
  place: Place | null;
};

export async function getStudentForStudent(id: number): Promise<StudentForStudent | null> {
  const d = await db();
  const [student] = await d
    .select({ id: students.id, studentId: students.studentId, firstName: students.firstName })
    .from(students)
    .where(eq(students.id, id));
  if (!student) return null;
  return { ...student, place: (await loadPlace(id))?.place ?? null };
}
