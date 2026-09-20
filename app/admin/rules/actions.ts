"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { action } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { schoolSettings } from "@/lib/db/schema";
import { cleanRulesHtml } from "@/lib/rules";

const schema = z.object({
  rules: z.string().max(40000, "The rules are too long — keep them under 40,000 characters"),
});

// The rules arrive as the editor's HTML and are cleaned through the same schema before
// they are stored, so nothing pasted in can carry more than text and structure.
export const updateSchoolRules = action(schema, async (input, { user, db }) => {
  requireAdmin(user);
  const rules = cleanRulesHtml(input.rules) || null;
  const before = await db.query.schoolSettings.findFirst({ columns: { rules: true } });
  await db.update(schoolSettings).set({ rules });
  await audit(db, {
    actorUserId: user.id,
    action: "school_settings.update",
    entityType: "school_settings",
    entityId: 1,
    changes: { rules: [before?.rules ?? null, rules] },
  });
  for (const area of ["admin", "teacher", "family", "student"]) revalidatePath(`/${area}/rules`);
  revalidatePath("/student");
});
