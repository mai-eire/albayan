"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { appUrl } from "@/lib/app-url";
import { audit, diff } from "@/lib/audit";
import type { Db } from "@/lib/db";
import { listFeesForStudent } from "@/lib/db/queries/fees";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import {
  classes,
  enrolments,
  guardians,
  paymentMethods,
  payments,
  studentGuardians,
  students,
  users,
  type PaymentMethod,
} from "@/lib/db/schema";
import { sendNotice } from "@/lib/email";
import { methodLabels } from "@/lib/fees";
import { optionalText } from "@/lib/fields";
import { eurosField, formatEuros } from "@/lib/money";
import { notify } from "@/lib/notify";
import { formatDate } from "@/lib/time";

const paymentFields = {
  amount: eurosField.refine((cents) => cents > 0, { message: "Enter the amount paid" }),
  method: z.enum(paymentMethods, { message: "Choose how they paid" }),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date they paid"),
  paidByGuardianId: z.number().int().nullable(),
  reference: optionalText(80),
  note: optionalText(300),
  // The office has seen that this is more than the year still owes and means it.
  overPayment: z.boolean().default(false),
};

// Taking more than the year still owes is allowed — a family pays ahead, or hands over a
// round sum — but on purpose, the same way a child goes into a full class: the form warns
// and asks for a tick, and this refuses without it. `insteadOfCents` is the amount being
// replaced when a payment is corrected, which shouldn't count against itself.
async function checkAmount(
  studentId: number,
  academicYearId: string,
  amountCents: number,
  { overPayment, insteadOfCents = 0 }: { overPayment: boolean; insteadOfCents?: number },
) {
  if (overPayment) return;
  const years = await listFeesForStudent(studentId);
  const account = years.find((y) => y.enrolment.academicYearId === academicYearId);
  if (!account) return;
  const owed = Math.max(0, account.feeCents - (account.paidCents - insteadOfCents));
  if (amountCents <= owed) return;
  throw new ActionError(
    owed === 0
      ? `Nothing is owed for ${academicYearId}. Tick the box to record it anyway.`
      : `That's more than the ${formatEuros(owed)} still owed for ${academicYearId}. Tick the box to record it anyway.`,
  );
}

// "Paid by" must be one of the child's guardians, so a payment can't be pinned on a stranger.
async function checkPaidBy(db: Db, studentId: number, guardianId: number | null) {
  if (guardianId === null) return;
  const link = await db.query.studentGuardians.findFirst({
    where: and(
      eq(studentGuardians.studentId, studentId),
      eq(studentGuardians.guardianId, guardianId),
    ),
  });
  if (!link) throw new ActionError("That person isn't one of this child's guardians.");
}

// What came in and what is left, to every guardian of that child and nobody else: the
// audience is the guardian links on this student, so another family never hears of it.
async function tellTheFamily(
  db: Db,
  studentId: number,
  academicYearId: string,
  payment: { amountCents: number; paidOn: string; method: PaymentMethod },
) {
  const [settings, child, contacts, years] = await Promise.all([
    getSchoolSettings(),
    db.query.students.findFirst({
      columns: { firstName: true },
      where: eq(students.id, studentId),
    }),
    db
      .select({ userId: users.id, name: users.name, email: users.email })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .innerJoin(users, eq(users.id, guardians.userId))
      .where(eq(studentGuardians.studentId, studentId)),
    listFeesForStudent(studentId),
  ]);
  if (!child || contacts.length === 0) return;
  const account = years.find((y) => y.enrolment.academicYearId === academicYearId);
  const owed = account ? Math.max(0, account.balanceCents) : 0;
  const title = `${formatEuros(payment.amountCents)} received for ${child.firstName}`;
  const body = `${methodLabels[payment.method]} on ${formatDate(payment.paidOn, settings.timezone)}. ${
    owed > 0
      ? `Still to pay: ${formatEuros(owed)}.`
      : `${child.firstName}'s fees for ${academicYearId} are paid in full.`
  }`;
  const href = `/family/${studentId}/fees`;
  const url = await appUrl(href);
  for (const contact of contacts) {
    await notify(db, {
      userId: contact.userId,
      type: "payment.recorded",
      title,
      body,
      href,
      studentId,
      email: () => sendNotice(contact, { title, body, url }, settings.name),
    });
  }
}

function revalidateFees(studentId: number) {
  revalidatePath("/admin");
  revalidatePath("/admin/fees");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/guardians");
  revalidatePath("/family");
}

export const recordPayment = action(
  z.object({ enrolmentId: z.number().int(), ...paymentFields }),
  async ({ enrolmentId, amount, overPayment, ...rest }, { user, db }) => {
    requireAdmin(user);
    const enrolment = await db.query.enrolments.findFirst({
      where: and(eq(enrolments.id, enrolmentId), eq(enrolments.status, "active")),
    });
    if (!enrolment) throw new ActionError("That place no longer exists.");
    await checkPaidBy(db, enrolment.studentId, rest.paidByGuardianId);
    const cls = await db.query.classes.findFirst({
      columns: { academicYearId: true },
      where: eq(classes.id, enrolment.classId),
    });
    if (cls) {
      await checkAmount(enrolment.studentId, cls.academicYearId, amount, {
        overPayment,
      });
    }
    const row = { enrolmentId, amountCents: amount, ...rest, recordedByUserId: user.id };
    const [created] = await db.insert(payments).values(row).returning({ id: payments.id });
    await audit(db, {
      actorUserId: user.id,
      action: "payment.record",
      entityType: "payment",
      entityId: created.id,
      changes: { ...row, studentId: enrolment.studentId },
    });
    if (cls) {
      await tellTheFamily(db, enrolment.studentId, cls.academicYearId, {
        amountCents: amount,
        paidOn: rest.paidOn,
        method: rest.method,
      });
    }
    revalidateFees(enrolment.studentId);
    return { id: created.id, studentId: enrolment.studentId };
  },
);

async function existingPayment(db: Db, id: number) {
  const [row] = await db
    .select({
      payment: payments,
      studentId: enrolments.studentId,
      academicYearId: classes.academicYearId,
    })
    .from(payments)
    .innerJoin(enrolments, eq(enrolments.id, payments.enrolmentId))
    .innerJoin(classes, eq(classes.id, enrolments.classId))
    .where(eq(payments.id, id));
  if (!row) throw new ActionError("That payment no longer exists.");
  return row;
}

// A mis-entered payment is corrected in place; the audit row keeps what it said before.
export const updatePayment = action(
  z.object({ id: z.number().int(), ...paymentFields }),
  async ({ id, amount, overPayment, ...rest }, { user, db }) => {
    requireAdmin(user);
    const { payment, studentId, academicYearId } = await existingPayment(db, id);
    await checkPaidBy(db, studentId, rest.paidByGuardianId);
    await checkAmount(studentId, academicYearId, amount, {
      overPayment,
      insteadOfCents: payment.amountCents,
    });
    const changes = { amountCents: amount, ...rest };
    const changed = diff(payment, changes);
    if (Object.keys(changed).length === 0) return;
    await db.update(payments).set(changes).where(eq(payments.id, id));
    await audit(db, {
      actorUserId: user.id,
      action: "payment.update",
      entityType: "payment",
      entityId: id,
      changes: { ...changed, studentId },
    });
    revalidateFees(studentId);
  },
);

export const deletePayment = action(
  z.object({ id: z.number().int() }),
  async ({ id }, { user, db }) => {
    requireAdmin(user);
    const { payment, studentId } = await existingPayment(db, id);
    await db.delete(payments).where(eq(payments.id, id));
    await audit(db, {
      actorUserId: user.id,
      action: "payment.delete",
      entityType: "payment",
      entityId: id,
      changes: { ...payment, studentId },
    });
    revalidateFees(studentId);
  },
);

// The agreed fee for the year, on the active place. Discounts are this edit plus a note.
export const updateEnrolmentFee = action(
  z.object({ enrolmentId: z.number().int(), fee: eurosField, feeNote: optionalText(120) }),
  async ({ enrolmentId, fee, feeNote }, { user, db }) => {
    requireAdmin(user);
    const enrolment = await db.query.enrolments.findFirst({
      where: and(eq(enrolments.id, enrolmentId), eq(enrolments.status, "active")),
    });
    if (!enrolment) throw new ActionError("That place no longer exists.");
    const changes = { feeCents: fee, feeNote };
    const changed = diff(enrolment, changes);
    if (Object.keys(changed).length === 0) return;
    await db.update(enrolments).set(changes).where(eq(enrolments.id, enrolmentId));
    await audit(db, {
      actorUserId: user.id,
      action: "enrolment.update_fee",
      entityType: "student",
      entityId: enrolment.studentId,
      changes: { ...changed, enrolmentId },
    });
    revalidateFees(enrolment.studentId);
  },
);
