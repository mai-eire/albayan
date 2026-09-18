"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { guardianGenders, relationships, studentGuardians } from "@/lib/db/schema";
import { optionalText } from "@/lib/fields";
import { addGuardianToChildren, inviteGuardian } from "@/lib/guardians";

// The office invites a guardian: on their own (they register children themselves), or as a
// co-guardian of some of a registered guardian's children.
export const inviteGuardianFromOffice = action(
  z.object({
    name: z.string().trim().min(2, "Enter their name").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: optionalText(30),
    gender: z.enum(guardianGenders).nullable(),
    // Set together, or not at all.
    withGuardianId: z.number().int().nullable(),
    relationship: z.enum(relationships).nullable(),
    studentIds: z.array(z.number().int()),
  }),
  async (input, { user, db }) => {
    requireAdmin(user);
    const actor = { id: user.id, name: user.name };
    if (input.withGuardianId === null || input.studentIds.length === 0) {
      const result = await inviteGuardian(db, actor, input);
      revalidatePath("/admin/guardians");
      return result;
    }
    if (!input.relationship) throw new ActionError("Say who they are to the children.");
    const theirs = await db
      .select({ studentId: studentGuardians.studentId })
      .from(studentGuardians)
      .where(
        and(
          eq(studentGuardians.guardianId, input.withGuardianId),
          inArray(studentGuardians.studentId, input.studentIds),
        ),
      );
    if (theirs.length !== input.studentIds.length)
      throw new ActionError("Pick children of the guardian you chose.");
    const result = await addGuardianToChildren(db, actor, {
      ...input,
      relationship: input.relationship,
    });
    revalidatePath("/admin/guardians");
    for (const id of input.studentIds) revalidatePath(`/admin/students/${id}`);
    return result;
  },
);
