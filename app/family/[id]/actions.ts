"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canViewStudent, loadStudentFacts, requireArea } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { ageOn } from "@/lib/age";
import { audit, diff } from "@/lib/audit";
import { clock } from "@/lib/clock";
import type { Db } from "@/lib/db";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { genders, students } from "@/lib/db/schema";
import { optionalText } from "@/lib/fields";
import { todayIn } from "@/lib/time";
import { withSchoolYearRule } from "@/app/family/register-child/schema";

// A family keeps their own child's record straight. What they may change is what they
// know better than the office: who the child is, what year they are in, and their health.
// The student ID, the Arabic level and the class are the school's, and stay with it.
// Every change is audited, so the office can see what a family corrected and when.
async function theirChild(db: Db, id: number) {
  const [user, facts] = await Promise.all([requireArea("family"), loadStudentFacts(id)]);
  if (!facts || !canViewStudent(user, facts)) throw new ActionError("That child isn't yours.");
  const before = await db.query.students.findFirst({ where: eq(students.id, id) });
  if (!before) throw new ActionError("That child no longer exists.");
  return { user, before };
}

async function save(
  db: Db,
  id: number,
  actorUserId: number,
  before: typeof students.$inferSelect,
  values: Partial<typeof students.$inferInsert>,
) {
  await db.update(students).set(values).where(eq(students.id, id));
  await audit(db, {
    actorUserId,
    action: "student.update_by_guardian",
    entityType: "student",
    entityId: id,
    changes: diff(before, values),
  });
  revalidatePath(`/family/${id}`);
  revalidatePath(`/admin/students/${id}`);
  revalidatePath("/student");
}

export const updateChildDetails = action(
  withSchoolYearRule(
    z.object({
      id: z.number().int(),
      firstName: z.string().trim().min(1, "Enter their first name").max(60),
      lastName: z.string().trim().min(1, "Enter their surname").max(60),
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter their date of birth"),
      gender: z.enum(genders),
      schoolYearGroup: optionalText(40),
      isHomeschooled: z.boolean(),
    }),
  ),
  async ({ id, ...input }, { user, db }) => {
    const { before } = await theirChild(db, id);
    const { timezone } = await getSchoolSettings();
    const today = todayIn(timezone, await clock());
    if (input.dateOfBirth > today || ageOn(input.dateOfBirth, today) > 18) {
      throw new ActionError("Check the date of birth — we take children up to 18.");
    }
    await save(db, id, user.id, before, input);
  },
);

export const updateChildHealth = action(
  z.object({
    id: z.number().int(),
    allergies: z.array(z.string().trim().min(1).max(60)).max(10),
    medicalNotes: optionalText(1000),
  }),
  async ({ id, allergies, medicalNotes }, { user, db }) => {
    const { before } = await theirChild(db, id);
    await save(db, id, user.id, before, {
      allergies: allergies.join(", ") || null,
      medicalNotes,
    });
  },
);
