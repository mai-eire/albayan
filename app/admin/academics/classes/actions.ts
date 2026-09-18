"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { classes, enrolments, schoolSessions, teachingAssignments } from "@/lib/db/schema";
import { todayIn } from "@/lib/time";

const classSchema = z.object({
  sessionId: z.coerce.number().int(),
  name: z.string().trim().min(1, "Give the class a name").max(40, "Use at most 40 characters"),
  room: z
    .string()
    .trim()
    .max(40)
    .transform((v) => v || null)
    .nullable(),
  capacity: z.coerce.number().int().min(1).max(200).nullable(),
  classTeacherId: z.coerce.number().int().nullable(),
});

export type ClassInput = z.input<typeof classSchema>;

export const createClass = action(classSchema, async (input, { user, db }) => {
  requireAdmin(user);
  const session = await db.query.schoolSessions.findFirst({
    where: eq(schoolSessions.id, input.sessionId),
  });
  if (!session) throw new ActionError("Choose a session.");
  const [row] = await db
    .insert(classes)
    .values({ ...input, academicYearId: session.academicYearId })
    .returning({ id: classes.id });
  await audit(db, {
    actorUserId: user.id,
    action: "class.create",
    entityType: "class",
    entityId: row.id,
    changes: { created: [null, input] },
  });
  revalidatePath("/admin/academics");
  return { id: row.id };
});

export const updateClass = action(
  classSchema.safeExtend({ id: z.number() }),
  async ({ id, ...input }, { user, db }) => {
    requireAdmin(user);
    const before = await db.query.classes.findFirst({ where: eq(classes.id, id) });
    if (!before) throw new ActionError("That class no longer exists.");
    const session = await db.query.schoolSessions.findFirst({
      where: eq(schoolSessions.id, input.sessionId),
    });
    if (!session || session.academicYearId !== before.academicYearId)
      throw new ActionError("Choose a session in the same year.");
    await db.update(classes).set(input).where(eq(classes.id, id));
    await audit(db, {
      actorUserId: user.id,
      action: "class.update",
      entityType: "class",
      entityId: id,
      changes: diff(before, input),
    });
    revalidatePath("/admin/academics");
  },
);

export const deleteClass = action(z.object({ id: z.number() }), async ({ id }, { user, db }) => {
  requireAdmin(user);
  const [{ n }] = await db
    .select({ n: count() })
    .from(enrolments)
    .where(eq(enrolments.classId, id));
  if (n > 0)
    throw new ActionError(
      `This class has ${n} ${n === 1 ? "enrolment" : "enrolments"}. Move the students first.`,
    );
  const before = await db.query.classes.findFirst({ where: eq(classes.id, id) });
  if (!before) return;
  await db.delete(classes).where(eq(classes.id, id));
  await audit(db, {
    actorUserId: user.id,
    action: "class.delete",
    entityType: "class",
    entityId: id,
    changes: { deleted: [before, null] },
  });
  revalidatePath("/admin/academics");
});

// One row per subject in the session's schedule; null clears the assignment.
export const assignTeachers = action(
  z.object({
    classId: z.number(),
    assignments: z
      .array(z.object({ subjectId: z.string(), teacherId: z.number().nullable() }))
      .max(30),
  }),
  async ({ classId, assignments }, { user, db }) => {
    requireAdmin(user);
    const cls = await db.query.classes.findFirst({ where: eq(classes.id, classId) });
    if (!cls) throw new ActionError("That class no longer exists.");
    const before = await db
      .select({
        subjectId: teachingAssignments.subjectId,
        teacherId: teachingAssignments.teacherId,
      })
      .from(teachingAssignments)
      .where(eq(teachingAssignments.classId, classId));
    for (const { subjectId, teacherId } of assignments) {
      const existing = before.find((b) => b.subjectId === subjectId);
      if (teacherId === null) {
        if (existing)
          await db
            .delete(teachingAssignments)
            .where(
              and(
                eq(teachingAssignments.classId, classId),
                eq(teachingAssignments.subjectId, subjectId),
              ),
            );
      } else if (!existing) {
        await db.insert(teachingAssignments).values({ classId, subjectId, teacherId });
      } else if (existing.teacherId !== teacherId) {
        await db
          .update(teachingAssignments)
          .set({ teacherId })
          .where(
            and(
              eq(teachingAssignments.classId, classId),
              eq(teachingAssignments.subjectId, subjectId),
            ),
          );
      }
    }
    await audit(db, {
      actorUserId: user.id,
      action: "class.assign_teachers",
      entityType: "class",
      entityId: classId,
      changes: { assignments: [before, assignments] },
    });
    revalidatePath("/admin/academics");
  },
);

// Moves a student to another class of the same year: the old enrolment ends today and a
// new one starts, carrying the fee, so the history stays.
export const moveStudent = action(
  z.object({
    enrolmentId: z.number().int(),
    classId: z.number().int(),
    // The admin has seen that the class is full and wants them placed anyway.
    overCapacity: z.boolean().default(false),
  }),
  async (input, { user, db }) => {
    requireAdmin(user);
    const current = await db.query.enrolments.findFirst({
      where: and(eq(enrolments.id, input.enrolmentId), eq(enrolments.status, "active")),
    });
    if (!current) throw new ActionError("That place no longer exists.");
    if (current.classId === input.classId) throw new ActionError("They're already in that class.");
    const [from, to] = await Promise.all([
      db.query.classes.findFirst({ where: eq(classes.id, current.classId) }),
      db.query.classes.findFirst({ where: eq(classes.id, input.classId) }),
    ]);
    if (!from || !to || from.academicYearId !== to.academicYearId) {
      throw new ActionError("Students can only move between classes of the same year.");
    }
    if (to.capacity !== null && !input.overCapacity) {
      const [{ n }] = await db
        .select({ n: count() })
        .from(enrolments)
        .where(and(eq(enrolments.classId, to.id), eq(enrolments.status, "active")));
      if (n >= to.capacity)
        throw new ActionError(
          `${to.name} is full (${n} of ${to.capacity} places). Tick the box to place them anyway.`,
        );
    }
    const { timezone } = await getSchoolSettings();
    const today = todayIn(timezone);
    await db
      .update(enrolments)
      .set({ status: "left", endDate: today })
      .where(eq(enrolments.id, current.id));
    const [next] = await db
      .insert(enrolments)
      .values({
        studentId: current.studentId,
        classId: to.id,
        startDate: today,
        feeCents: current.feeCents,
        feeNote: current.feeNote,
      })
      .returning({ id: enrolments.id });
    await audit(db, {
      actorUserId: user.id,
      action: "enrolment.move",
      entityType: "student",
      entityId: current.studentId,
      changes: { classId: [from.id, to.id], enrolmentId: [current.id, next.id] },
    });
    revalidatePath("/admin/academics");
    revalidatePath("/admin/students");
    revalidatePath("/teach");
    revalidatePath("/family");
  },
);
