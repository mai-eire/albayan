"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { classes, schoolSessions, sessionPeriods, subjects } from "@/lib/db/schema";

const sessionSchema = z.object({
  academicYearId: z.string(),
  name: z.string().trim().min(1, "Give the session a name").max(40, "Use at most 40 characters"),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time like 10:00"),
  isActive: z.boolean(),
});

export type SessionInput = z.input<typeof sessionSchema>;

export const createSession = action(sessionSchema, async (input, { user, db }) => {
  requireAdmin(user);
  const [row] = await db.insert(schoolSessions).values(input).returning({ id: schoolSessions.id });
  await audit(db, {
    actorUserId: user.id,
    action: "session.create",
    entityType: "school_session",
    entityId: row.id,
    changes: { created: [null, input] },
  });
  revalidatePath("/admin/academics");
  return { id: row.id };
});

export const updateSession = action(
  sessionSchema.safeExtend({ id: z.number() }),
  async ({ id, ...input }, { user, db }) => {
    requireAdmin(user);
    const before = await db.query.schoolSessions.findFirst({ where: eq(schoolSessions.id, id) });
    if (!before) throw new ActionError("That session no longer exists.");
    await db.update(schoolSessions).set(input).where(eq(schoolSessions.id, id));
    await audit(db, {
      actorUserId: user.id,
      action: "session.update",
      entityType: "school_session",
      entityId: id,
      changes: diff(before, input),
    });
    revalidatePath("/admin/academics");
  },
);

export const deleteSession = action(z.object({ id: z.number() }), async ({ id }, { user, db }) => {
  requireAdmin(user);
  const [{ n }] = await db.select({ n: count() }).from(classes).where(eq(classes.sessionId, id));
  if (n > 0)
    throw new ActionError(
      `This session has ${n} ${n === 1 ? "class" : "classes"}. Move or delete them first.`,
    );
  const before = await db.query.schoolSessions.findFirst({ where: eq(schoolSessions.id, id) });
  if (!before) return;
  await db.delete(schoolSessions).where(eq(schoolSessions.id, id));
  await audit(db, {
    actorUserId: user.id,
    action: "session.delete",
    entityType: "school_session",
    entityId: id,
    changes: { deleted: [before, null] },
  });
  revalidatePath("/admin/academics");
});

const periodSchema = z
  .object({
    subjectId: z.string().nullable(),
    title: z.string().trim().max(40).nullable(),
    durationMinutes: z.coerce
      .number()
      .int()
      .min(5, "At least 5 minutes")
      .max(240, "At most 4 hours"),
    staffOnly: z.boolean().default(false),
  })
  .refine((p) => (p.subjectId ? !p.title && !p.staffOnly : !!p.title), {
    message: "Pick a subject or give the slot a title",
  });

// The whole schedule is saved at once: what you see in the editor is what gets stored.
export const saveSchedule = action(
  z.object({ sessionId: z.number(), periods: z.array(periodSchema).max(20) }),
  async ({ sessionId, periods }, { user, db }) => {
    requireAdmin(user);
    const session = await db.query.schoolSessions.findFirst({
      where: eq(schoolSessions.id, sessionId),
    });
    if (!session) throw new ActionError("That session no longer exists.");
    const subjectIds = periods.flatMap((p) => (p.subjectId ? [p.subjectId] : []));
    if (subjectIds.length) {
      const known = await db.select({ id: subjects.id }).from(subjects);
      const missing = subjectIds.find((id) => !known.some((k) => k.id === id));
      if (missing) throw new ActionError(`Unknown subject "${missing}".`);
    }
    const before = await db
      .select()
      .from(sessionPeriods)
      .where(eq(sessionPeriods.sessionId, sessionId));
    await db.delete(sessionPeriods).where(eq(sessionPeriods.sessionId, sessionId));
    if (periods.length) {
      await db.insert(sessionPeriods).values(
        periods.map((p, i) => ({
          sessionId,
          sortOrder: i + 1,
          subjectId: p.subjectId,
          title: p.title,
          durationMinutes: p.durationMinutes,
          staffOnly: p.staffOnly,
        })),
      );
    }
    await audit(db, {
      actorUserId: user.id,
      action: "session.schedule",
      entityType: "school_session",
      entityId: sessionId,
      changes: {
        periods: [
          before.map(({ subjectId, title, durationMinutes, staffOnly }) => ({
            subjectId,
            title,
            durationMinutes,
            staffOnly,
          })),
          periods,
        ],
      },
    });
    revalidatePath("/admin/academics");
  },
);
