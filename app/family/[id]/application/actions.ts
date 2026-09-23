"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canViewStudent, loadStudentFacts, requireArea } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { ageOn } from "@/lib/age";
import { audit, diff } from "@/lib/audit";
import { clock } from "@/lib/clock";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { classes, schoolSessions, students } from "@/lib/db/schema";
import { todayIn } from "@/lib/time";
import { childStepSchema } from "@/app/family/register-child/schema";

// A family may correct their child's application until the office decides. The change is
// audited (decision 2026-09-23); the office reads the current version in the inbox, so
// nobody is notified for a typo.
export const updateApplication = action(
  childStepSchema.safeExtend({ id: z.number().int() }),
  async ({ id, ...input }, { user, db }) => {
    const [facts, { timezone }] = await Promise.all([loadStudentFacts(id), getSchoolSettings()]);
    await requireArea("family");
    if (!facts || !canViewStudent(user, facts)) throw new ActionError("That child isn't yours.");
    const before = await db.query.students.findFirst({ where: eq(students.id, id) });
    if (!before) throw new ActionError("That application no longer exists.");
    if (before.status !== "applied") {
      throw new ActionError(
        "The office has already decided on this application. Ring them if something is wrong.",
      );
    }
    const today = todayIn(timezone, await clock());
    const age = ageOn(input.dateOfBirth, today);
    if (input.dateOfBirth > today || age > 18) {
      throw new ActionError("Check the date of birth — we take children up to 18.");
    }
    const session = await db.query.schoolSessions.findFirst({
      where: and(
        eq(schoolSessions.id, input.preferredSessionId),
        eq(schoolSessions.isActive, true),
      ),
    });
    if (!session) throw new ActionError("That day is no longer available. Choose another.");
    if (input.preferredClassId !== null) {
      const cls = await db.query.classes.findFirst({
        where: and(eq(classes.id, input.preferredClassId), eq(classes.sessionId, session.id)),
      });
      if (!cls) throw new ActionError("That class isn't on the day you chose.");
    }
    const values = { ...input, applicationYearId: session.academicYearId };
    await db.update(students).set(values).where(eq(students.id, id));
    await audit(db, {
      actorUserId: user.id,
      action: "application.update",
      entityType: "student",
      entityId: id,
      changes: diff(before, values),
    });
    revalidatePath(`/family/${id}`);
    revalidatePath("/admin", "layout");
  },
);
