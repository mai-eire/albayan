import { and, asc, count, eq, inArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import {
  classes,
  enrolments,
  guardians,
  schoolSessions,
  sessionPeriods,
  studentGuardians,
  students,
  subjects,
  teachers,
  teachingAssignments,
  users,
} from "@/lib/db/schema";
import { timePeriods } from "@/lib/timetable";

// Teacher-facing queries. Every select here lists its columns; nothing under the
// "sensitive" rules in CLAUDE.md (ethnicity, languages, reasons, address, guardian
// contact details) is ever named. lib/db/queries/teach.test.ts checks the SQL.

export type TeacherClassRow = {
  id: number;
  name: string;
  room: string | null;
  sessionName: string;
  startTime: string;
  studentCount: number;
  isClassTeacher: boolean;
  subjects: string[];
};

export async function listClassesForTeacher(
  teacherId: number,
  academicYearId: string,
): Promise<TeacherClassRow[]> {
  const d = await db();
  const rows = await d
    .select({
      id: classes.id,
      name: classes.name,
      room: classes.room,
      classTeacherId: classes.classTeacherId,
      sessionName: schoolSessions.name,
      startTime: schoolSessions.startTime,
      studentCount: count(enrolments.id),
    })
    .from(classes)
    .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .leftJoin(enrolments, and(eq(enrolments.classId, classes.id), eq(enrolments.status, "active")))
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
    )
    .groupBy(classes.id)
    .orderBy(asc(schoolSessions.dayOfWeek), asc(classes.name));
  if (!rows.length) return [];
  const mine = await d
    .select({ classId: teachingAssignments.classId, subject: subjects.name })
    .from(teachingAssignments)
    .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
    .where(
      and(
        eq(teachingAssignments.teacherId, teacherId),
        inArray(
          teachingAssignments.classId,
          rows.map((r) => r.id),
        ),
      ),
    );
  return rows.map(({ classTeacherId, ...r }) => ({
    ...r,
    isClassTeacher: classTeacherId === teacherId,
    subjects: mine.filter((m) => m.classId === r.id).map((m) => m.subject),
  }));
}

export type RosterRow = {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  arabicProficiency: (typeof students.$inferSelect)["arabicProficiency"];
  hasAllergies: boolean;
  hasMedicalNotes: boolean;
};

export type ClassForTeacher = {
  id: number;
  name: string;
  room: string | null;
  academicYearId: string;
  session: { name: string; startTime: string };
  classTeacherName: string | null;
  periods: {
    id: number;
    subjectId: string | null;
    subjectName: string | null;
    title: string | null;
    durationMinutes: number;
    teacherName: string | null;
  }[];
  roster: RosterRow[];
};

export async function getClassForTeacher(classId: number): Promise<ClassForTeacher | null> {
  const d = await db();
  const classTeacher = alias(teachers, "class_teacher");
  const classTeacherUser = alias(users, "class_teacher_user");
  const [cls] = await d
    .select({
      id: classes.id,
      name: classes.name,
      room: classes.room,
      academicYearId: classes.academicYearId,
      sessionId: classes.sessionId,
      sessionName: schoolSessions.name,
      startTime: schoolSessions.startTime,
      classTeacherName: classTeacherUser.name,
    })
    .from(classes)
    .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .leftJoin(classTeacher, eq(classTeacher.id, classes.classTeacherId))
    .leftJoin(classTeacherUser, eq(classTeacherUser.id, classTeacher.userId))
    .where(eq(classes.id, classId));
  if (!cls) return null;
  const [periods, assignments, roster] = await Promise.all([
    d
      .select({
        id: sessionPeriods.id,
        subjectId: sessionPeriods.subjectId,
        subjectName: subjects.name,
        title: sessionPeriods.title,
        durationMinutes: sessionPeriods.durationMinutes,
      })
      .from(sessionPeriods)
      .leftJoin(subjects, eq(subjects.id, sessionPeriods.subjectId))
      .where(eq(sessionPeriods.sessionId, cls.sessionId))
      .orderBy(asc(sessionPeriods.sortOrder)),
    d
      .select({ subjectId: teachingAssignments.subjectId, teacherName: users.name })
      .from(teachingAssignments)
      .innerJoin(teachers, eq(teachers.id, teachingAssignments.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(eq(teachingAssignments.classId, classId)),
    d
      .select({
        id: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        dateOfBirth: students.dateOfBirth,
        arabicProficiency: students.arabicProficiency,
        allergies: students.allergies,
        medicalNotes: students.medicalNotes,
      })
      .from(enrolments)
      .innerJoin(students, eq(students.id, enrolments.studentId))
      .where(and(eq(enrolments.classId, classId), eq(enrolments.status, "active")))
      .orderBy(asc(students.firstName), asc(students.lastName)),
  ]);
  return {
    id: cls.id,
    name: cls.name,
    room: cls.room,
    academicYearId: cls.academicYearId,
    session: { name: cls.sessionName, startTime: cls.startTime },
    classTeacherName: cls.classTeacherName,
    periods: periods.map((p) => ({
      ...p,
      teacherName: assignments.find((a) => a.subjectId === p.subjectId)?.teacherName ?? null,
    })),
    roster: roster.map(({ allergies, medicalNotes, ...s }) => ({
      ...s,
      hasAllergies: Boolean(allergies),
      hasMedicalNotes: Boolean(medicalNotes),
    })),
  };
}

export type StudentForTeacher = {
  id: number;
  studentId: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: (typeof students.$inferSelect)["gender"];
  schoolYearGroup: string | null;
  arabicProficiency: (typeof students.$inferSelect)["arabicProficiency"];
  allergies: string | null;
  medicalNotes: string | null;
  className: string | null;
  sessionName: string | null;
  // Names and relationships only; the office holds the contact details. Emergency
  // contacts are here because a teacher may need one during a lesson.
  guardians: {
    name: string;
    relationship: string;
    isPrimaryContact: boolean;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactRelationship: string | null;
  }[];
};

export async function getStudentForTeacher(id: number): Promise<StudentForTeacher | null> {
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
      className: classes.name,
      sessionName: schoolSessions.name,
    })
    .from(students)
    .leftJoin(
      enrolments,
      and(eq(enrolments.studentId, students.id), eq(enrolments.status, "active")),
    )
    .leftJoin(classes, eq(classes.id, enrolments.classId))
    .leftJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .where(eq(students.id, id));
  if (!student) return null;
  const guardianRows = await d
    .select({
      name: users.name,
      relationship: studentGuardians.relationship,
      isPrimaryContact: studentGuardians.isPrimaryContact,
      emergencyContactName: guardians.emergencyContactName,
      emergencyContactPhone: guardians.emergencyContactPhone,
      emergencyContactRelationship: guardians.emergencyContactRelationship,
    })
    .from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .innerJoin(users, eq(users.id, guardians.userId))
    .where(eq(studentGuardians.studentId, id))
    .orderBy(asc(studentGuardians.isPrimaryContact));
  return { ...student, guardians: guardianRows.reverse() };
}

export type Lesson = {
  classId: number;
  className: string;
  room: string | null;
  sessionName: string;
  subjectId: string;
  subjectName: string;
  startTime: string;
  endTime: string;
  // The teacher can take this class's register: class teacher, or teaches its first period.
  canTakeRegister: boolean;
};

// My lessons on a weekday, in time order: every period of a session running that day whose
// subject I teach in a class of that session.
export async function listLessonsForTeacher(
  teacherId: number,
  academicYearId: string,
  dayOfWeek: number,
): Promise<Lesson[]> {
  const d = await db();
  const sessions = await d
    .select({
      id: schoolSessions.id,
      name: schoolSessions.name,
      startTime: schoolSessions.startTime,
    })
    .from(schoolSessions)
    .where(
      and(
        eq(schoolSessions.academicYearId, academicYearId),
        eq(schoolSessions.dayOfWeek, dayOfWeek),
        eq(schoolSessions.isActive, true),
      ),
    );
  if (!sessions.length) return [];
  const sessionIds = sessions.map((s) => s.id);
  const [periods, myClasses, assignments] = await Promise.all([
    d
      .select({
        sessionId: sessionPeriods.sessionId,
        subjectId: sessionPeriods.subjectId,
        subjectName: subjects.name,
        title: sessionPeriods.title,
        durationMinutes: sessionPeriods.durationMinutes,
      })
      .from(sessionPeriods)
      .leftJoin(subjects, eq(subjects.id, sessionPeriods.subjectId))
      .where(inArray(sessionPeriods.sessionId, sessionIds))
      .orderBy(asc(sessionPeriods.sortOrder)),
    d
      .select({
        id: classes.id,
        name: classes.name,
        room: classes.room,
        sessionId: classes.sessionId,
        classTeacherId: classes.classTeacherId,
      })
      .from(classes)
      .where(inArray(classes.sessionId, sessionIds)),
    d
      .select({ classId: teachingAssignments.classId, subjectId: teachingAssignments.subjectId })
      .from(teachingAssignments)
      .where(eq(teachingAssignments.teacherId, teacherId)),
  ]);
  const lessons: Lesson[] = [];
  for (const session of sessions) {
    const timed = timePeriods(
      session.startTime,
      periods.filter((p) => p.sessionId === session.id),
    );
    const firstSubject = timed.find((p) => p.subjectId)?.subjectId ?? null;
    for (const cls of myClasses.filter((c) => c.sessionId === session.id)) {
      const mine = assignments.filter((a) => a.classId === cls.id).map((a) => a.subjectId);
      const canTakeRegister =
        cls.classTeacherId === teacherId || (firstSubject !== null && mine.includes(firstSubject));
      for (const p of timed) {
        if (!p.subjectId || !mine.includes(p.subjectId)) continue;
        lessons.push({
          classId: cls.id,
          className: cls.name,
          room: cls.room,
          sessionName: session.name,
          subjectId: p.subjectId,
          subjectName: p.subjectName ?? p.subjectId,
          startTime: p.startTime,
          endTime: p.endTime,
          canTakeRegister,
        });
      }
    }
  }
  return lessons.sort((a, b) => a.startTime.localeCompare(b.startTime));
}
