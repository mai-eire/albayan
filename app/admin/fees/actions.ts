"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import type { Db } from "@/lib/db";
import { enrolments, paymentMethods, payments, studentGuardians } from "@/lib/db/schema";
import { optionalText } from "@/lib/fields";
import { eurosField } from "@/lib/money";

const paymentFields = {
  amount: eurosField.refine((cents) => cents > 0, { message: "Enter the amount paid" }),
  method: z.enum(paymentMethods, { message: "Choose how they paid" }),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date they paid"),
  paidByGuardianId: z.number().int().nullable(),
  reference: optionalText(80),
  note: optionalText(300),
};

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

function revalidateFees(studentId: number) {
  revalidatePath("/admin");
  revalidatePath("/admin/fees");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/guardians");
  revalidatePath("/family");
}

export const recordPayment = action(
  z.object({ enrolmentId: z.number().int(), ...paymentFields }),
  async ({ enrolmentId, amount, ...rest }, { user, db }) => {
    requireAdmin(user);
    const enrolment = await db.query.enrolments.findFirst({
      where: and(eq(enrolments.id, enrolmentId), eq(enrolments.status, "active")),
    });
    if (!enrolment) throw new ActionError("That place no longer exists.");
    await checkPaidBy(db, enrolment.studentId, rest.paidByGuardianId);
    const row = { enrolmentId, amountCents: amount, ...rest, recordedByUserId: user.id };
    const [created] = await db.insert(payments).values(row).returning({ id: payments.id });
    await audit(db, {
      actorUserId: user.id,
      action: "payment.record",
      entityType: "payment",
      entityId: created.id,
      changes: { ...row, studentId: enrolment.studentId },
    });
    revalidateFees(enrolment.studentId);
    return { id: created.id, studentId: enrolment.studentId };
  },
);

async function existingPayment(db: Db, id: number) {
  const [row] = await db
    .select({ payment: payments, studentId: enrolments.studentId })
    .from(payments)
    .innerJoin(enrolments, eq(enrolments.id, payments.enrolmentId))
    .where(eq(payments.id, id));
  if (!row) throw new ActionError("That payment no longer exists.");
  return row;
}

// A mis-entered payment is corrected in place; the audit row keeps what it said before.
export const updatePayment = action(
  z.object({ id: z.number().int(), ...paymentFields }),
  async ({ id, amount, ...rest }, { user, db }) => {
    requireAdmin(user);
    const { payment, studentId } = await existingPayment(db, id);
    await checkPaidBy(db, studentId, rest.paidByGuardianId);
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
