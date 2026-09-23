"use server";

import { clock } from "@/lib/clock";
import { and, count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { appUrl } from "@/lib/app-url";
import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import type { Db } from "@/lib/db";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import {
  classes,
  enrolments,
  guardians,
  schoolSessions,
  studentGuardians,
  students,
  users,
} from "@/lib/db/schema";
import { sendApproved, sendDeclined } from "@/lib/email";
import { eurosField } from "@/lib/money";
import { notify } from "@/lib/notify";
import { createStudentAccount } from "@/lib/student-accounts";
import { nextStudentId } from "@/lib/student-ids";
import { todayIn } from "@/lib/time";

// An application the office may still act on. A place can be offered to a child who was
// turned down earlier — the office changes its mind, or a place opens up.
async function applicationFor(db: Db, id: number, allowed: ("applied" | "declined")[]) {
  const student = await db.query.students.findFirst({
    where: and(eq(students.id, id), inArray(students.status, allowed)),
  });
  if (!student) throw new ActionError("That application has already been dealt with.");
  const [contact] = await db
    .select({ userId: users.id, name: users.name, email: users.email })
    .from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .innerJoin(users, eq(users.id, guardians.userId))
    .where(and(eq(studentGuardians.studentId, id), eq(studentGuardians.isPrimaryContact, true)));
  if (!contact) throw new ActionError("This application has no guardian to write to.");
  return { student, contact };
}

// Places the child: student ID, a sign-in for them, the enrolment carrying the agreed fee,
// and an email to the guardian with the ID and first password.
export const approveApplication = action(
  z.object({
    id: z.number().int(),
    classId: z.number().int({ message: "Choose a class" }),
    fee: eurosField,
    feeNote: z.string().trim().max(120).optional(),
    // A word to the family when the place isn't the one they asked for; goes in the email.
    offerNote: z.string().trim().max(500).optional(),
    // The admin has seen that the class is full and wants them placed anyway.
    overCapacity: z.boolean().default(false),
  }),
  async (input, { user, db }) => {
    requireAdmin(user);
    const { student, contact } = await applicationFor(db, input.id, ["applied", "declined"]);
    const [placement] = await db
      .select({ cls: classes, session: schoolSessions })
      .from(classes)
      .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
      .where(eq(classes.id, input.classId));
    if (!placement) throw new ActionError("That class no longer exists.");
    if (placement.cls.capacity !== null && !input.overCapacity) {
      const [{ n }] = await db
        .select({ n: count() })
        .from(enrolments)
        .where(and(eq(enrolments.classId, placement.cls.id), eq(enrolments.status, "active")));
      if (n >= placement.cls.capacity)
        throw new ActionError(
          `${placement.cls.name} is full (${n} of ${placement.cls.capacity} places). Tick the box to place them anyway.`,
        );
    }
    const offerNote = input.offerNote || null;

    const settings = await getSchoolSettings();
    const studentId = await nextStudentId(
      db,
      settings.studentIdPrefix,
      placement.cls.academicYearId,
    );
    const name = `${student.firstName} ${student.lastName}`;
    const { userId, password } = await createStudentAccount(await auth(), db, { studentId, name });
    const now = new Date().toISOString();
    await db
      .update(students)
      // Offering a place undoes an earlier refusal; the audit log keeps that history.
      .set({
        studentId,
        userId,
        status: "active",
        approvedAt: now,
        offerNote,
        declinedReason: null,
        declinedAt: null,
      })
      .where(eq(students.id, student.id));
    const [enrolment] = await db
      .insert(enrolments)
      .values({
        studentId: student.id,
        classId: placement.cls.id,
        startDate: todayIn(settings.timezone, await clock()),
        feeCents: input.fee,
        feeNote: input.feeNote || null,
      })
      .returning({ id: enrolments.id });
    await audit(db, {
      actorUserId: user.id,
      action: "student.approve",
      entityType: "student",
      entityId: student.id,
      changes: {
        status: [student.status, "active"],
        studentId: [null, studentId],
        classId: [null, placement.cls.id],
        feeCents: [null, input.fee],
        enrolmentId: [null, enrolment.id],
        offerNote: [null, offerNote],
      },
    });
    const loginUrl = await appUrl("/login");
    await notify(db, {
      userId: contact.userId,
      type: "application.approved",
      title: `${student.firstName} has a place in ${placement.cls.name}`,
      body: `Student ID ${studentId}. The first password is in the email we sent you.${offerNote ? ` ${offerNote}` : ""}`,
      href: `/family/${student.id}`,
      email: () =>
        sendApproved(
          contact,
          {
            childName: student.firstName,
            studentId,
            password,
            placement: `${placement.cls.name} on ${placement.session.name}`,
            note: offerNote,
            loginUrl,
          },
          settings.name,
        ),
    });
    // The nav carries the pending count, so the whole area is revalidated.
    revalidatePath("/admin", "layout");
    revalidatePath("/family");
    return { studentId };
  },
);

export const declineApplication = action(
  z.object({
    id: z.number().int(),
    reason: z.string().trim().min(10, "Give the family a reason").max(1000),
  }),
  async (input, { user, db }) => {
    requireAdmin(user);
    const { student, contact } = await applicationFor(db, input.id, ["applied"]);
    await db
      .update(students)
      .set({
        status: "declined",
        declinedReason: input.reason,
        declinedAt: new Date().toISOString(),
      })
      .where(eq(students.id, student.id));
    await audit(db, {
      actorUserId: user.id,
      action: "student.decline",
      entityType: "student",
      entityId: student.id,
      changes: { status: ["applied", "declined"], reason: [null, input.reason] },
    });
    const { name: schoolName } = await getSchoolSettings();
    await notify(db, {
      userId: contact.userId,
      type: "application.declined",
      title: `About ${student.firstName}'s application`,
      body: input.reason,
      href: `/family/${student.id}`,
      email: () =>
        sendDeclined(contact, { childName: student.firstName, reason: input.reason }, schoolName),
    });
    revalidatePath("/admin", "layout");
    revalidatePath("/family");
  },
);
