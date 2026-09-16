"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canEditRegister, loadClassFacts } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import {
  attendance,
  attendanceStatuses,
  enrolments,
  guardians,
  studentGuardians,
  students,
  users,
} from "@/lib/db/schema";
import { sendAbsence } from "@/lib/email";
import { optionalText } from "@/lib/fields";
import { notify } from "@/lib/notify";
import { formatDate, todayIn } from "@/lib/time";

const schema = z.object({
  classId: z.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z
    .array(
      z.object({
        studentId: z.number().int(),
        status: z.enum(attendanceStatuses),
        note: optionalText(200),
      }),
    )
    .min(1),
});

export type RegisterInput = z.input<typeof schema>;

// Writes the whole register for a class and date. Rows already there are updated, so a
// second save is an edit; edits after the day are admin-only and audited with before/after.
// New absences tell the guardians (email only if the school has turned that on).
export const saveRegister = action(schema, async (input, { user, db }) => {
  const settings = await getSchoolSettings();
  const today = todayIn(settings.timezone);
  if (input.date > today) throw new ActionError("You can't take a register for a future day.");
  const facts = await loadClassFacts(input.classId);
  if (!facts || !canEditRegister(user, facts, input.date, today)) {
    throw new ActionError(
      input.date === today
        ? "You don't have access to this class."
        : "Past registers can only be changed by the office.",
    );
  }
  const roster = await db
    .select({ studentId: enrolments.studentId })
    .from(enrolments)
    .where(and(eq(enrolments.classId, input.classId), eq(enrolments.status, "active")));
  const allowed = new Set(roster.map((r) => r.studentId));
  const entries = input.entries.filter((e) => allowed.has(e.studentId));
  if (!entries.length) throw new ActionError("Nobody is in this class.");

  const before = await db
    .select({ studentId: attendance.studentId, status: attendance.status, note: attendance.note })
    .from(attendance)
    .where(
      and(
        eq(attendance.date, input.date),
        inArray(
          attendance.studentId,
          entries.map((e) => e.studentId),
        ),
      ),
    );
  const previous = new Map(before.map((b) => [b.studentId, b]));
  const now = new Date().toISOString();
  const changes: Record<string, [unknown, unknown]> = {};
  const newlyAbsent: number[] = [];
  for (const entry of entries) {
    const old = previous.get(entry.studentId);
    if (old) {
      if (old.status === entry.status && old.note === entry.note) continue;
      await db
        .update(attendance)
        .set({ status: entry.status, note: entry.note, recordedByUserId: user.id, updatedAt: now })
        .where(and(eq(attendance.studentId, entry.studentId), eq(attendance.date, input.date)));
      changes[entry.studentId] = [
        `${old.status}${old.note ? ` (${old.note})` : ""}`,
        `${entry.status}${entry.note ? ` (${entry.note})` : ""}`,
      ];
    } else {
      await db.insert(attendance).values({
        studentId: entry.studentId,
        classId: input.classId,
        date: input.date,
        status: entry.status,
        note: entry.note,
        recordedByUserId: user.id,
      });
      changes[entry.studentId] = [null, `${entry.status}${entry.note ? ` (${entry.note})` : ""}`];
    }
    if (entry.status === "absent" && old?.status !== "absent") newlyAbsent.push(entry.studentId);
  }
  if (input.date !== today && Object.keys(changes).length) {
    await audit(db, {
      actorUserId: user.id,
      action: "attendance.edit",
      entityType: "register",
      entityId: `${input.classId}:${input.date}`,
      changes,
    });
  }

  if (newlyAbsent.length) {
    const contacts = await db
      .select({
        studentId: students.id,
        firstName: students.firstName,
        userId: users.id,
        name: users.name,
        email: users.email,
      })
      .from(studentGuardians)
      .innerJoin(students, eq(students.id, studentGuardians.studentId))
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .innerJoin(users, eq(users.id, guardians.userId))
      .where(inArray(studentGuardians.studentId, newlyAbsent));
    const cls = await db.query.classes.findFirst({
      columns: { name: true },
      where: (c, { eq }) => eq(c.id, input.classId),
    });
    const date = formatDate(input.date, settings.timezone);
    for (const c of contacts) {
      const details = { childName: c.firstName, date, className: cls?.name ?? "class" };
      await notify(db, {
        userId: c.userId,
        type: "attendance.absent",
        title: `${c.firstName} was marked absent`,
        body: `${details.className} on ${date}.`,
        href: `/family/${c.studentId}`,
        email: settings.absenceEmails ? () => sendAbsence(c, details, settings.name) : undefined,
      });
    }
  }
  revalidatePath("/teach");
  revalidatePath("/admin/attendance");
  revalidatePath("/family");
});
