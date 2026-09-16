"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { arabicProficiencies, genders, students } from "@/lib/db/schema";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const detailsSchema = z.object({
  id: z.number().int(),
  firstName: z.string().trim().min(1, "Enter their first name").max(60),
  lastName: z.string().trim().min(1, "Enter their surname").max(60),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter their date of birth"),
  gender: z.enum(genders),
  schoolYearGroup: optionalText(40),
  arabicProficiency: z.enum(arabicProficiencies),
  email: optionalText(120),
  phone: optionalText(30),
});

const healthSchema = z.object({
  id: z.number().int(),
  allergies: optionalText(500),
  medicalNotes: optionalText(1000),
});

const ethnicitySchema = z.object({ id: z.number().int(), ethnicity: optionalText(60) });

// One action per card on the profile; each audits the fields that actually changed.
function update(
  name: string,
  schema: z.ZodType<{ id: number } & Record<string, unknown>, unknown>,
) {
  return action(schema, async ({ id, ...changes }, { user, db }) => {
    requireAdmin(user);
    const before = await db.query.students.findFirst({ where: eq(students.id, id) });
    if (!before) throw new ActionError("That student no longer exists.");
    const changed = diff(before, changes);
    if (Object.keys(changed).length === 0) return;
    await db.update(students).set(changes).where(eq(students.id, id));
    await audit(db, {
      actorUserId: user.id,
      action: `student.${name}`,
      entityType: "student",
      entityId: id,
      changes: changed,
    });
    revalidatePath(`/admin/students/${id}`);
  });
}

export const updateStudentDetails = update("update_details", detailsSchema);
export const updateStudentHealth = update("update_health", healthSchema);
export const updateStudentEthnicity = update("update_ethnicity", ethnicitySchema);
