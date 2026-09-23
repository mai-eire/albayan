import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import { getCurrentYear } from "@/lib/db/queries/academics";
import {
  feeAccountsForStudents,
  listFeesForStudent,
  listPaymentsForGuardian,
  type FeeAccountRow,
  type PaymentRow,
  type StudentFeeYear,
} from "@/lib/db/queries/fees";
import { familyStart, forFamilies } from "@/lib/timetable";
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
  classId: number;
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
        staffOnly: sessionPeriods.staffOnly,
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
      classId: row.classId,
      className: row.className,
      room: row.room,
      sessionName: row.sessionName,
      dayOfWeek: row.dayOfWeek,
      // Staff-only slots are left out and the day starts at the first slot the family sees.
      startTime: familyStart(row.startTime, periods),
      classTeacherName: row.classTeacherName,
      periods: forFamilies(periods).map(
        ({ staffOnly: _s, ...p }) => (
          void _s,
          {
            ...p,
            teacherName: assignments.find((a) => a.subjectId === p.subjectId)?.teacherName ?? null,
          }
        ),
      ),
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
  isHomeschooled: boolean;
  arabicProficiency: Student["arabicProficiency"];
  allergies: string | null;
  medicalNotes: string | null;
  status: Student["status"];
  // The application as it was made, and what became of it.
  appliedAt: string;
  decidedAt: string | null;
  academicYearId: string | null;
  applicationNotes: string | null;
  preferredSessionId: number | null;
  preferredSessionName: string | null;
  preferredClassName: string | null;
  declinedReason: string | null;
  // The office's word when the place offered wasn't the one asked for.
  offerNote: string | null;
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
      isHomeschooled: students.isHomeschooled,
      arabicProficiency: students.arabicProficiency,
      allergies: students.allergies,
      medicalNotes: students.medicalNotes,
      status: students.status,
      appliedAt: students.appliedAt,
      approvedAt: students.approvedAt,
      declinedAt: students.declinedAt,
      academicYearId: students.applicationYearId,
      applicationNotes: students.applicationNotes,
      declinedReason: students.declinedReason,
      offerNote: students.offerNote,
      preferredSessionId: students.preferredSessionId,
      preferredSessionName: schoolSessions.name,
      preferredClassName: students.preferredClassName,
    })
    .from(students)
    .leftJoin(schoolSessions, eq(schoolSessions.id, students.preferredSessionId))
    .where(eq(students.id, id));
  if (!student) return null;
  const placed = await loadPlace(id);
  const { approvedAt, declinedAt, ...rest } = student;
  return {
    ...rest,
    decidedAt: student.status === "declined" ? declinedAt : approvedAt,
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

// Fees are the family's own money: a guardian may see every figure the office keeps about
// their children, and nothing about anyone else's. These two wrap the fee queries so the
// viewer is part of the call and no page reaches for the office's version by accident.

// One child's fee for the year they are in now, with the payments recorded against it.
export async function feeForChild(studentId: number): Promise<StudentFeeYear | null> {
  const [current] = await listFeesForStudent(studentId);
  return current ?? null;
}

export type FamilyFees = {
  year: string | null;
  children: FeeAccountRow[];
  payments: PaymentRow[];
};

// Where the whole family stands this year, and every payment made for any of the children.
export async function feesForGuardian(guardianId: number, childIds: number[]): Promise<FamilyFees> {
  const [year, payments] = await Promise.all([
    getCurrentYear(),
    listPaymentsForGuardian(guardianId),
  ]);
  const accounts = year ? await feeAccountsForStudents(year.id, childIds) : new Map();
  return { year: year?.id ?? null, children: [...accounts.values()], payments };
}
