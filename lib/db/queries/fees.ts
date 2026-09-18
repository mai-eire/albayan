import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import {
  classes,
  enrolments,
  guardians,
  payments,
  schoolSessions,
  studentGuardians,
  students,
  users,
} from "@/lib/db/schema";
import { feeAccounts, outstandingCents, type FeeAccount } from "@/lib/fees";
import { familyKeyByStudent } from "./students";

// Admin-only fee queries. Balances are derived in lib/fees.ts from enrolments and payments;
// nothing here is stored.

const primaryGuardian = alias(guardians, "primary_guardian");
const primaryGuardianUser = alias(users, "primary_guardian_user");

type AccountEnrolment = {
  id: number;
  studentId: number;
  studentCode: string | null;
  firstName: string;
  lastName: string;
  studentStatus: (typeof students.$inferSelect)["status"];
  classId: number;
  className: string;
  sessionId: number;
  sessionName: string;
  feeCents: number;
  feeNote: string | null;
  status: "active" | "left";
  startDate: string;
  guardianId: number | null;
  guardianName: string | null;
};

export type FeeAccountRow = FeeAccount<AccountEnrolment>;

// Every student placed in the year with their fee, payments and balance, in timetable order.
export async function listFeeAccounts(academicYearId: string): Promise<FeeAccountRow[]> {
  const d = await db();
  const rows = await d
    .select({
      id: enrolments.id,
      studentId: students.id,
      studentCode: students.studentId,
      firstName: students.firstName,
      lastName: students.lastName,
      studentStatus: students.status,
      classId: classes.id,
      className: classes.name,
      sessionId: schoolSessions.id,
      sessionName: schoolSessions.name,
      feeCents: enrolments.feeCents,
      feeNote: enrolments.feeNote,
      status: enrolments.status,
      startDate: enrolments.startDate,
      guardianId: primaryGuardian.id,
      guardianName: primaryGuardianUser.name,
    })
    .from(enrolments)
    .innerJoin(students, eq(students.id, enrolments.studentId))
    .innerJoin(classes, eq(classes.id, enrolments.classId))
    .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
    .leftJoin(
      studentGuardians,
      and(eq(studentGuardians.studentId, students.id), eq(studentGuardians.isPrimaryContact, true)),
    )
    .leftJoin(primaryGuardian, eq(primaryGuardian.id, studentGuardians.guardianId))
    .leftJoin(primaryGuardianUser, eq(primaryGuardianUser.id, primaryGuardian.userId))
    .where(eq(classes.academicYearId, academicYearId))
    .orderBy(
      sql`(${schoolSessions.dayOfWeek} + 6) % 7`,
      asc(schoolSessions.startTime),
      asc(classes.name),
      asc(students.lastName),
      asc(students.firstName),
    );
  if (!rows.length) return [];
  const paid = await d
    .select({ enrolmentId: payments.enrolmentId, amountCents: payments.amountCents })
    .from(payments)
    .where(
      inArray(
        payments.enrolmentId,
        rows.map((r) => r.id),
      ),
    );
  // feeAccounts groups by student in first-seen order, so the timetable order survives.
  return feeAccounts(rows, paid);
}

// The dashboard tile: what is owed for the year, out of what the year's fees add up to,
// and by how many families.
export async function feesOutstanding(
  academicYearId: string,
): Promise<{ totalCents: number; feesCents: number; families: number }> {
  const accounts = await listFeeAccounts(academicYearId);
  const owing = accounts.filter((a) => a.balanceCents > 0);
  return {
    totalCents: outstandingCents(owing),
    feesCents: accounts.reduce((sum, a) => sum + a.feeCents, 0),
    families: await countFamilies(owing),
  };
}

// How many families the accounts belong to (a student with no guardian counts as one).
export async function countFamilies(accounts: FeeAccountRow[]): Promise<number> {
  const keyOf = await familyKeyByStudent();
  return new Set(
    accounts.map((a) => keyOf.get(a.enrolment.studentId) ?? `s${a.enrolment.studentId}`),
  ).size;
}

export type PaymentRow = {
  id: number;
  enrolmentId: number;
  amountCents: number;
  paidOn: string;
  method: (typeof payments.$inferSelect)["method"];
  reference: string | null;
  note: string | null;
  paidByGuardianId: number | null;
  paidByName: string | null;
  recordedByName: string;
  studentId: number;
  studentName: string;
  academicYearId: string;
};

const paidBy = alias(guardians, "paid_by");
const paidByUser = alias(users, "paid_by_user");
const recordedBy = alias(users, "recorded_by");

function paymentRows(d: Awaited<ReturnType<typeof db>>) {
  return d
    .select({
      id: payments.id,
      enrolmentId: payments.enrolmentId,
      amountCents: payments.amountCents,
      paidOn: payments.paidOn,
      method: payments.method,
      reference: payments.reference,
      note: payments.note,
      paidByGuardianId: payments.paidByGuardianId,
      paidByName: paidByUser.name,
      recordedByName: recordedBy.name,
      studentId: students.id,
      studentName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
      academicYearId: classes.academicYearId,
    })
    .from(payments)
    .innerJoin(enrolments, eq(enrolments.id, payments.enrolmentId))
    .innerJoin(students, eq(students.id, enrolments.studentId))
    .innerJoin(classes, eq(classes.id, enrolments.classId))
    .innerJoin(recordedBy, eq(recordedBy.id, payments.recordedByUserId))
    .leftJoin(paidBy, eq(paidBy.id, payments.paidByGuardianId))
    .leftJoin(paidByUser, eq(paidByUser.id, paidBy.userId))
    .orderBy(desc(payments.paidOn), desc(payments.id));
}

export type StudentFeeYear = FeeAccount<{
  id: number;
  studentId: number;
  feeCents: number;
  feeNote: string | null;
  status: "active" | "left";
  startDate: string;
  academicYearId: string;
  className: string;
}> & { payments: PaymentRow[] };

// The student's fee, payments and balance for every year they have had a place, newest first.
export async function listFeesForStudent(studentId: number): Promise<StudentFeeYear[]> {
  const d = await db();
  const [places, rows] = await Promise.all([
    d
      .select({
        id: enrolments.id,
        studentId: enrolments.studentId,
        feeCents: enrolments.feeCents,
        feeNote: enrolments.feeNote,
        status: enrolments.status,
        startDate: enrolments.startDate,
        academicYearId: classes.academicYearId,
        className: classes.name,
      })
      .from(enrolments)
      .innerJoin(classes, eq(classes.id, enrolments.classId))
      .where(eq(enrolments.studentId, studentId)),
    paymentRows(d).where(eq(students.id, studentId)),
  ]);
  const years = [...new Set(places.map((p) => p.academicYearId))].sort().reverse();
  return years.map((year) => {
    const yearPlaces = places.filter((p) => p.academicYearId === year);
    const yearPayments = rows.filter((p) => p.academicYearId === year);
    const [account] = feeAccounts(yearPlaces, yearPayments);
    return { ...account, payments: yearPayments };
  });
}

// Every payment made for any of the guardian's children, newest first.
export async function listPaymentsForGuardian(guardianId: number): Promise<PaymentRow[]> {
  const d = await db();
  const children = await d
    .select({ studentId: studentGuardians.studentId })
    .from(studentGuardians)
    .where(eq(studentGuardians.guardianId, guardianId));
  if (!children.length) return [];
  return paymentRows(d).where(
    inArray(
      students.id,
      children.map((c) => c.studentId),
    ),
  );
}

export async function getPayment(id: number): Promise<PaymentRow | null> {
  const [row] = await paymentRows(await db()).where(eq(payments.id, id));
  return row ?? null;
}

// Who can be recorded as "paid by" for a place: the child's guardians.
export type PaymentTarget = {
  enrolmentId: number;
  studentId: number;
  label: string;
  // Lets the picker match "ALB-26-0042" as well as the name.
  studentCode: string | null;
  feeCents: number;
  paidCents: number;
  guardians: { id: number; name: string }[];
};

export async function listPaymentTargets(academicYearId: string): Promise<PaymentTarget[]> {
  const d = await db();
  const accounts = await listFeeAccounts(academicYearId);
  const active = accounts.filter((a) => a.enrolment.status === "active");
  if (!active.length) return [];
  const links = await d
    .select({ studentId: studentGuardians.studentId, id: guardians.id, name: users.name })
    .from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .innerJoin(users, eq(users.id, guardians.userId))
    .where(
      inArray(
        studentGuardians.studentId,
        active.map((a) => a.enrolment.studentId),
      ),
    )
    .orderBy(desc(studentGuardians.isPrimaryContact));
  return active.map(({ enrolment: e, feeCents, paidCents }) => ({
    enrolmentId: e.id,
    studentId: e.studentId,
    label: `${e.firstName} ${e.lastName} · ${e.className} · ${e.sessionName}`,
    studentCode: e.studentCode,
    feeCents,
    paidCents,
    guardians: links
      .filter((l) => l.studentId === e.studentId)
      .map(({ id, name }) => ({ id, name })),
  }));
}

// The year's accounts for some students — a family's children — keyed by student.
export async function feeAccountsForStudents(
  academicYearId: string,
  studentIds: number[],
): Promise<Map<number, FeeAccountRow>> {
  if (!studentIds.length) return new Map();
  const wanted = new Set(studentIds);
  const accounts = await listFeeAccounts(academicYearId);
  return new Map(
    accounts
      .filter((a) => wanted.has(a.enrolment.studentId))
      .map((a) => [a.enrolment.studentId, a]),
  );
}
