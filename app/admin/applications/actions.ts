"use server";

import { and, eq } from "drizzle-orm";
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
import { createStudentAccount } from "@/lib/student-accounts";
import { nextStudentId } from "@/lib/student-ids";
import { todayIn } from "@/lib/time";

async function pendingApplication(db: Db, id: number) {
  const student = await db.query.students.findFirst({
    where: and(eq(students.id, id), eq(students.status, "applied")),
  });
  if (!student) throw new ActionError("That application has already been dealt with.");
  const [contact] = await db
    .select({ name: users.name, email: users.email })
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
  }),
  async (input, { user, db }) => {
    requireAdmin(user);
    const { student, contact } = await pendingApplication(db, input.id);
    const [placement] = await db
      .select({ cls: classes, session: schoolSessions })
      .from(classes)
      .innerJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
      .where(eq(classes.id, input.classId));
    if (!placement) throw new ActionError("That class no longer exists.");

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
      .set({ studentId, userId, status: "active", approvedAt: now })
      .where(eq(students.id, student.id));
    const [enrolment] = await db
      .insert(enrolments)
      .values({
        studentId: student.id,
        classId: placement.cls.id,
        startDate: todayIn(settings.timezone),
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
        studentId: [null, studentId],
        classId: [null, placement.cls.id],
        feeCents: [null, input.fee],
        enrolmentId: [null, enrolment.id],
      },
    });
    await sendApproved(
      contact,
      {
        childName: student.firstName,
        studentId,
        password,
        placement: `${placement.cls.name} on ${placement.session.name}`,
        loginUrl: await appUrl("/login"),
      },
      settings.name,
    );
    revalidatePath("/admin");
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
    const { student, contact } = await pendingApplication(db, input.id);
    await db
      .update(students)
      .set({ status: "declined", declinedReason: input.reason })
      .where(eq(students.id, student.id));
    await audit(db, {
      actorUserId: user.id,
      action: "student.decline",
      entityType: "student",
      entityId: student.id,
      changes: { status: ["applied", "declined"], reason: [null, input.reason] },
    });
    await sendDeclined(
      contact,
      { childName: student.firstName, reason: input.reason },
      (await getSchoolSettings()).name,
    );
    revalidatePath("/admin");
    revalidatePath("/family");
  },
);
