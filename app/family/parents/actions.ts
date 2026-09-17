"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireGuardian } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { guardianGenders, relationships, studentGuardians } from "@/lib/db/schema";
import { optionalText } from "@/lib/fields";
import { addGuardianToChildren } from "@/lib/guardians";

// A parent adds the other parent (or a grandparent) to some or all of their children.
export const addParent = action(
  z.object({
    name: z.string().trim().min(2, "Enter their name").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: optionalText(30),
    gender: z.enum(guardianGenders).nullable(),
    relationship: z.enum(relationships, { message: "Say who they are to the children" }),
    studentIds: z.array(z.number().int()).min(1, "Pick at least one child"),
  }),
  async (input, { user, db }) => {
    const me = requireGuardian(user);
    if (input.email === user.email.toLowerCase()) {
      throw new ActionError("That's your own email address.");
    }
    // Only my own children.
    const mine = await db
      .select({ studentId: studentGuardians.studentId })
      .from(studentGuardians)
      .where(
        and(
          eq(studentGuardians.guardianId, me.id),
          inArray(studentGuardians.studentId, input.studentIds),
        ),
      );
    if (mine.length !== input.studentIds.length) {
      throw new ActionError("You can only add a parent to your own children.");
    }
    const result = await addGuardianToChildren(db, { id: user.id, name: user.name }, input);
    revalidatePath("/family");
    return result;
  },
);
