import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import {
  classes,
  enrolments,
  guardians,
  schoolSessions,
  studentGuardians,
  students,
  users,
} from "@/lib/db/schema";

// Per-viewer queries (CLAUDE.md "Privacy is structural"): each function selects only what
// its viewer may see. Teacher-facing shapes never include ethnicity, languages, reasons,
// address or guardian contact details.

type Student = typeof students.$inferSelect;

// ---- Family ---------------------------------------------------------------------------

export type ChildSummary = {
  id: number;
  firstName: string;
  lastName: string;
  status: Student["status"];
  preferredSessionName: string | null;
};

export async function listChildrenForGuardian(guardianId: number): Promise<ChildSummary[]> {
  const d = await db();
  return d
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      status: students.status,
      preferredSessionName: schoolSessions.name,
    })
    .from(studentGuardians)
    .innerJoin(students, eq(students.id, studentGuardians.studentId))
    .leftJoin(schoolSessions, eq(schoolSessions.id, students.preferredSessionId))
    .where(eq(studentGuardians.guardianId, guardianId))
    .orderBy(asc(students.dateOfBirth));
}

// The guardian's own row, for pre-filling the application wizard and the account page.
export async function getGuardianSelf(guardianId: number) {
  return (await db()).query.guardians.findFirst({ where: eq(guardians.id, guardianId) });
}

// ---- Admin ----------------------------------------------------------------------------

export type StudentFilters = {
  status?: Student["status"];
  sessionId?: number;
  classId?: number;
  q?: string;
};

export type StudentListRow = {
  id: number;
  studentId: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  status: Student["status"];
  className: string | null;
  sessionName: string | null;
  guardianName: string | null;
};

// The active enrolment's class and session, joined once for lists and profiles.
const activeEnrolment = and(eq(enrolments.studentId, students.id), eq(enrolments.status, "active"));

export async function listStudentsForAdmin(
  filters: StudentFilters = {},
): Promise<StudentListRow[]> {
  const d = await db();
  const guardianUser = alias(users, "guardian_user");
  const where = [
    filters.status ? eq(students.status, filters.status) : undefined,
    filters.classId ? eq(classes.id, filters.classId) : undefined,
    filters.sessionId ? eq(schoolSessions.id, filters.sessionId) : undefined,
    filters.q
      ? or(
          like(sql`${students.firstName} || ' ' || ${students.lastName}`, `%${filters.q}%`),
          like(students.studentId, `%${filters.q}%`),
        )
      : undefined,
  ];
  return d
    .select({
      id: students.id,
      studentId: students.studentId,
      firstName: students.firstName,
      lastName: students.lastName,
      dateOfBirth: students.dateOfBirth,
      status: students.status,
      className: classes.name,
      sessionName: schoolSessions.name,
      guardianName: guardianUser.name,
    })
    .from(students)
    .leftJoin(enrolments, activeEnrolment)
    .leftJoin(classes, eq(classes.id, enrolments.classId))
    .leftJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .leftJoin(
      studentGuardians,
      and(eq(studentGuardians.studentId, students.id), eq(studentGuardians.isPrimaryContact, true)),
    )
    .leftJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .leftJoin(guardianUser, eq(guardianUser.id, guardians.userId))
    .where(and(...where))
    .orderBy(asc(students.lastName), asc(students.firstName));
}

export type GuardianForAdmin = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  relationship: string;
  isPrimaryContact: boolean;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
};

export type StudentForAdmin = Student & {
  enrolment: {
    id: number;
    className: string;
    classId: number;
    sessionName: string;
    academicYearId: string;
    startDate: string;
    feeCents: number;
    feeNote: string | null;
  } | null;
  preferredSessionName: string | null;
  preferredClassName: string | null;
  guardians: GuardianForAdmin[];
  // Everything under here is admin-only and rendered inside SensitiveSection.
  sensitive: {
    ethnicity: string | null;
    guardians: {
      id: number;
      name: string;
      address: string | null;
      area: string | null;
      spokenLanguages: string[];
      ethnicity: string | null;
      registrationReasons: string[];
      registrationReasonOther: string | null;
    }[];
  };
};

export async function getStudentForAdmin(id: number): Promise<StudentForAdmin | null> {
  const d = await db();
  const student = await d.query.students.findFirst({ where: eq(students.id, id) });
  if (!student) return null;
  const preferredClass = alias(classes, "preferred_class");
  const [[enrolment], guardianRows, [preferred]] = await Promise.all([
    d
      .select({
        id: enrolments.id,
        className: classes.name,
        classId: classes.id,
        sessionName: schoolSessions.name,
        academicYearId: classes.academicYearId,
        startDate: enrolments.startDate,
        feeCents: enrolments.feeCents,
        feeNote: enrolments.feeNote,
      })
      .from(enrolments)
      .innerJoin(classes, eq(classes.id, enrolments.classId))
      .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
      .where(and(eq(enrolments.studentId, id), eq(enrolments.status, "active"))),
    d
      .select({ link: studentGuardians, guardian: guardians, user: users })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .innerJoin(users, eq(users.id, guardians.userId))
      .where(eq(studentGuardians.studentId, id))
      .orderBy(desc(studentGuardians.isPrimaryContact)),
    d
      .select({ sessionName: schoolSessions.name, className: preferredClass.name })
      .from(students)
      .leftJoin(schoolSessions, eq(schoolSessions.id, students.preferredSessionId))
      .leftJoin(preferredClass, eq(preferredClass.id, students.preferredClassId))
      .where(eq(students.id, id)),
  ]);
  return {
    ...student,
    enrolment: enrolment ?? null,
    preferredSessionName: preferred?.sessionName ?? null,
    preferredClassName: preferred?.className ?? null,
    guardians: guardianRows.map(({ link, guardian, user }) => ({
      id: guardian.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      relationship: link.relationship,
      isPrimaryContact: link.isPrimaryContact,
      emergencyContactName: guardian.emergencyContactName,
      emergencyContactPhone: guardian.emergencyContactPhone,
      emergencyContactRelationship: guardian.emergencyContactRelationship,
    })),
    sensitive: {
      ethnicity: student.ethnicity,
      guardians: guardianRows.map(({ guardian, user }) => ({
        id: guardian.id,
        name: user.name,
        address:
          [guardian.addressLine1, guardian.addressLine2, guardian.city, guardian.postalCode]
            .filter(Boolean)
            .join(", ") || null,
        area: guardian.area,
        spokenLanguages: guardian.spokenLanguages ?? [],
        ethnicity: guardian.ethnicity,
        registrationReasons: guardian.registrationReasons ?? [],
        registrationReasonOther: guardian.registrationReasonOther,
      })),
    },
  };
}

export type GuardianListRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  children: string[];
};

export async function listGuardiansForAdmin(q?: string): Promise<GuardianListRow[]> {
  const d = await db();
  const rows = await d
    .select({ id: guardians.id, name: users.name, email: users.email, phone: users.phone })
    .from(guardians)
    .innerJoin(users, eq(users.id, guardians.userId))
    .where(q ? or(like(users.name, `%${q}%`), like(users.email, `%${q}%`)) : undefined)
    .orderBy(asc(users.name));
  if (!rows.length) return [];
  const kids = await d
    .select({ guardianId: studentGuardians.guardianId, firstName: students.firstName })
    .from(studentGuardians)
    .innerJoin(students, eq(students.id, studentGuardians.studentId))
    .where(
      inArray(
        studentGuardians.guardianId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(students.dateOfBirth));
  return rows.map((r) => ({
    ...r,
    children: kids.filter((k) => k.guardianId === r.id).map((k) => k.firstName),
  }));
}

export type GuardianProfile = {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  children: {
    id: number;
    firstName: string;
    lastName: string;
    status: Student["status"];
    relationship: string;
    className: string | null;
  }[];
  sensitive: {
    address: string | null;
    area: string | null;
    spokenLanguages: string[];
    ethnicity: string | null;
    registrationReasons: string[];
    registrationReasonOther: string | null;
  };
};

export async function getGuardianForAdmin(id: number): Promise<GuardianProfile | null> {
  const d = await db();
  const [row] = await d
    .select({ guardian: guardians, user: users })
    .from(guardians)
    .innerJoin(users, eq(users.id, guardians.userId))
    .where(eq(guardians.id, id));
  if (!row) return null;
  const children = await d
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      status: students.status,
      relationship: studentGuardians.relationship,
      className: classes.name,
    })
    .from(studentGuardians)
    .innerJoin(students, eq(students.id, studentGuardians.studentId))
    .leftJoin(enrolments, activeEnrolment)
    .leftJoin(classes, eq(classes.id, enrolments.classId))
    .where(eq(studentGuardians.guardianId, id))
    .orderBy(asc(students.dateOfBirth));
  const { guardian, user } = row;
  return {
    id: guardian.id,
    userId: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    emailVerified: user.emailVerified,
    emergencyContactName: guardian.emergencyContactName,
    emergencyContactPhone: guardian.emergencyContactPhone,
    emergencyContactRelationship: guardian.emergencyContactRelationship,
    children,
    sensitive: {
      address:
        [guardian.addressLine1, guardian.addressLine2, guardian.city, guardian.postalCode]
          .filter(Boolean)
          .join(", ") || null,
      area: guardian.area,
      spokenLanguages: guardian.spokenLanguages ?? [],
      ethnicity: guardian.ethnicity,
      registrationReasons: guardian.registrationReasons ?? [],
      registrationReasonOther: guardian.registrationReasonOther,
    },
  };
}
