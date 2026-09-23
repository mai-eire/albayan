import { and, asc, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import { groupFamilies } from "@/lib/families";
import {
  classes,
  enrolments,
  guardians,
  schoolSessions,
  studentGuardians,
  students,
  users,
  type GuardianGender,
  type RegistrationReason,
} from "@/lib/db/schema";

// Per-viewer queries (CLAUDE.md "Privacy is structural"): each function selects only what
// its viewer may see. Teacher-facing shapes never include countryOfOrigin, languages, reasons,
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

// What they were to the child they registered most recently — the wizard's default.
export async function lastRelationshipFor(guardianId: number): Promise<string | null> {
  const row = await (
    await db()
  ).query.studentGuardians.findFirst({
    columns: { relationship: true },
    where: eq(studentGuardians.guardianId, guardianId),
    orderBy: desc(studentGuardians.studentId),
  });
  return row?.relationship ?? null;
}

// ---- Admin ----------------------------------------------------------------------------

export type StudentListRow = {
  id: number;
  studentId: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  status: Student["status"];
  classId: number | null;
  className: string | null;
  sessionId: number | null;
  sessionName: string | null;
  // The primary contact, for the CSV export and search.
  guardianName: string | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
  // Everyone linked to the child, primary contact first.
  guardians: { id: number; name: string }[];
};

// The active enrolment's class and session, joined once for lists and profiles.
const activeEnrolment = and(eq(enrolments.studentId, students.id), eq(enrolments.status, "active"));

// Every student, whatever their status: the list filters in the browser (app/admin/students/filters.ts).
export async function listStudentsForAdmin(): Promise<StudentListRow[]> {
  const d = await db();
  const guardianUser = alias(users, "guardian_user");
  const links = await d
    .select({
      studentId: studentGuardians.studentId,
      id: guardians.id,
      name: users.name,
      isPrimaryContact: studentGuardians.isPrimaryContact,
    })
    .from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .innerJoin(users, eq(users.id, guardians.userId))
    .orderBy(desc(studentGuardians.isPrimaryContact), asc(users.name));
  const rows = await d
    .select({
      id: students.id,
      studentId: students.studentId,
      firstName: students.firstName,
      lastName: students.lastName,
      dateOfBirth: students.dateOfBirth,
      status: students.status,
      classId: classes.id,
      className: classes.name,
      sessionId: schoolSessions.id,
      sessionName: schoolSessions.name,
      guardianName: guardianUser.name,
      guardianEmail: guardianUser.email,
      guardianPhone: guardianUser.phone,
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
    .orderBy(asc(students.lastName), asc(students.firstName));
  return rows.map((r) => ({
    ...r,
    guardians: links.filter((l) => l.studentId === r.id).map(({ id, name }) => ({ id, name })),
  }));
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
    countryOfOrigin: string | null;
    guardians: {
      id: number;
      name: string;
      address: string | null;
      area: string | null;
      spokenLanguages: string[];
      countryOfOrigin: string | null;
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
      countryOfOrigin: student.countryOfOrigin,
      guardians: guardianRows.map(({ guardian, user }) => ({
        id: guardian.id,
        name: user.name,
        address:
          [guardian.addressLine1, guardian.addressLine2, guardian.city, guardian.postalCode]
            .filter(Boolean)
            .join(", ") || null,
        area: guardian.area,
        spokenLanguages: guardian.spokenLanguages ?? [],
        countryOfOrigin: guardian.countryOfOrigin,
        registrationReasons: guardian.registrationReasons ?? [],
        registrationReasonOther: guardian.registrationReasonOther,
      })),
    },
  };
}

export type GuardianChild = {
  id: number;
  studentId: string | null;
  firstName: string;
  lastName: string;
  status: Student["status"];
  classId: number | null;
  className: string | null;
  sessionId: number | null;
  sessionName: string | null;
};

export type GuardianListRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  gender: GuardianGender | null;
  relationship: string | null;
  // First contact for at least one child: the family name rule needs an order.
  isPrimary: boolean;
  children: GuardianChild[];
};

// Every guardian with their children and each child's place; lib/families.ts groups them
// and app/admin/guardians/filters.ts narrows them, both in the browser.
export async function listGuardiansForAdmin(): Promise<GuardianListRow[]> {
  const d = await db();
  const rows = await d
    .select({
      id: guardians.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      gender: guardians.gender,
    })
    .from(guardians)
    .innerJoin(users, eq(users.id, guardians.userId))
    .orderBy(asc(users.name));
  if (!rows.length) return [];
  const kids = await d
    .select({
      guardianId: studentGuardians.guardianId,
      relationship: studentGuardians.relationship,
      isPrimary: studentGuardians.isPrimaryContact,
      id: students.id,
      studentId: students.studentId,
      firstName: students.firstName,
      lastName: students.lastName,
      status: students.status,
      classId: classes.id,
      className: classes.name,
      sessionId: schoolSessions.id,
      sessionName: schoolSessions.name,
    })
    .from(studentGuardians)
    .innerJoin(students, eq(students.id, studentGuardians.studentId))
    .leftJoin(enrolments, activeEnrolment)
    .leftJoin(classes, eq(classes.id, enrolments.classId))
    .leftJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .orderBy(asc(students.dateOfBirth));
  return rows.map((r) => {
    const mine = kids.filter((k) => k.guardianId === r.id);
    return {
      ...r,
      relationship: mine[0]?.relationship ?? null,
      isPrimary: mine.some((k) => k.isPrimary),
      children: mine.map(
        ({ guardianId: _g, relationship: _r, isPrimary: _p, ...c }) => (
          void _g,
          void _r,
          void _p,
          c
        ),
      ),
    };
  });
}

export type GuardianProfile = {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  gender: GuardianGender | null;
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
    sessionName: string | null;
  }[];
  sensitive: {
    address: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    postalCode: string | null;
    area: string | null;
    spokenLanguages: string[];
    countryOfOrigin: string | null;
    registrationReasons: RegistrationReason[];
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
      sessionName: schoolSessions.name,
    })
    .from(studentGuardians)
    .innerJoin(students, eq(students.id, studentGuardians.studentId))
    .leftJoin(enrolments, activeEnrolment)
    .leftJoin(classes, eq(classes.id, enrolments.classId))
    .leftJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .where(eq(studentGuardians.guardianId, id))
    .orderBy(asc(students.dateOfBirth));
  const { guardian, user } = row;
  return {
    id: guardian.id,
    userId: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    gender: guardian.gender,
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
      addressLine1: guardian.addressLine1,
      addressLine2: guardian.addressLine2,
      city: guardian.city,
      postalCode: guardian.postalCode,
      area: guardian.area,
      spokenLanguages: guardian.spokenLanguages ?? [],
      countryOfOrigin: guardian.countryOfOrigin,
      registrationReasons: guardian.registrationReasons ?? [],
      registrationReasonOther: guardian.registrationReasonOther,
    },
  };
}

// Other attending children who share a guardian with this student — the admin applies
// whatever sibling discount is current by hand, so they need the number, not a rule.
export async function countEnrolledSiblings(studentId: number): Promise<number> {
  const d = await db();
  const sibling = alias(studentGuardians, "sibling");
  const rows = await d
    .selectDistinct({ id: sibling.studentId })
    .from(studentGuardians)
    .innerJoin(sibling, eq(sibling.guardianId, studentGuardians.guardianId))
    .innerJoin(students, eq(students.id, sibling.studentId))
    .where(
      and(
        eq(studentGuardians.studentId, studentId),
        sql`${sibling.studentId} <> ${studentId}`,
        eq(students.status, "active"),
      ),
    );
  return rows.length;
}

export type SiblingRow = {
  id: number;
  studentId: string | null;
  firstName: string;
  lastName: string;
  status: Student["status"];
  className: string | null;
  sessionName: string | null;
};

// Other children sharing a guardian with this student, oldest first.
export async function listSiblingsForAdmin(studentId: number): Promise<SiblingRow[]> {
  const d = await db();
  const sibling = alias(studentGuardians, "sibling");
  return d
    .selectDistinct({
      id: students.id,
      studentId: students.studentId,
      firstName: students.firstName,
      lastName: students.lastName,
      status: students.status,
      className: classes.name,
      sessionName: schoolSessions.name,
      dateOfBirth: students.dateOfBirth,
    })
    .from(studentGuardians)
    .innerJoin(sibling, eq(sibling.guardianId, studentGuardians.guardianId))
    .innerJoin(students, eq(students.id, sibling.studentId))
    .leftJoin(enrolments, activeEnrolment)
    .leftJoin(classes, eq(classes.id, enrolments.classId))
    .leftJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .where(
      and(eq(studentGuardians.studentId, studentId), sql`${sibling.studentId} <> ${studentId}`),
    )
    .orderBy(asc(students.dateOfBirth))
    .then((rows) => rows.map(({ dateOfBirth: _dob, ...r }) => (void _dob, r)));
}

// Which family each student belongs to (lib/families.ts), for counting families rather
// than guardians — "12 families still to pay".
export async function familyKeyByStudent(): Promise<Map<number, number>> {
  const families = groupFamilies<GuardianChild, GuardianListRow>(await listGuardiansForAdmin());
  const out = new Map<number, number>();
  for (const f of families) for (const c of f.children) out.set(c.id, f.key);
  return out;
}

export type CoGuardian = {
  id: number;
  name: string;
  gender: GuardianGender | null;
  // What they are to the children they share with this guardian ("Father"), and which.
  relationship: string;
  childNames: string[];
  // Whether they have set a password yet, so an invite that needs chasing is visible.
  signedIn: boolean;
};

// The other guardians of this guardian's children — the other parent, a grandparent.
// Names and relationships only, no contact details, so the family's own overview shows
// the same rows: in a separated family one parent's phone number is not the other's to give.
export async function listCoGuardians(guardianId: number): Promise<CoGuardian[]> {
  const d = await db();
  const other = alias(studentGuardians, "other");
  const rows = await d
    .select({
      id: guardians.id,
      name: users.name,
      gender: guardians.gender,
      relationship: other.relationship,
      childName: students.firstName,
      signedIn: sql<number>`${users.status} <> 'invited'`,
    })
    .from(studentGuardians)
    .innerJoin(other, eq(other.studentId, studentGuardians.studentId))
    .innerJoin(guardians, eq(guardians.id, other.guardianId))
    .innerJoin(users, eq(users.id, guardians.userId))
    .innerJoin(students, eq(students.id, other.studentId))
    .where(
      and(eq(studentGuardians.guardianId, guardianId), sql`${other.guardianId} <> ${guardianId}`),
    )
    .orderBy(asc(users.name), asc(students.dateOfBirth));
  const out: CoGuardian[] = [];
  for (const r of rows) {
    const g = out.find((o) => o.id === r.id);
    if (g) g.childNames.push(r.childName);
    else out.push({ ...r, childNames: [r.childName], signedIn: Boolean(r.signedIn) });
  }
  return out;
}
