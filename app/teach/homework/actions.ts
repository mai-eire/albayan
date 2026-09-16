"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { loadClassFacts, teachesSubjectIn } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { appUrl } from "@/lib/app-url";
import { audit } from "@/lib/audit";
import { listClassAudience } from "@/lib/db/queries/homework";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { classes, homework, subjects } from "@/lib/db/schema";
import { sendNotice } from "@/lib/email";
import { optionalText } from "@/lib/fields";
import { notify } from "@/lib/notify";
import { formatDate } from "@/lib/time";

const schema = z.object({
  id: z.number().int().optional(),
  classId: z.number().int({ message: "Choose a class" }),
  subjectId: z.string().min(1, "Choose a subject"),
  title: z.string().trim().min(2, "Give it a title").max(120),
  description: optionalText(4000),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a due date"),
  publish: z.boolean(),
});

export type HomeworkInput = z.input<typeof schema>;

async function allowed(
  user: Parameters<typeof teachesSubjectIn>[0],
  classId: number,
  subjectId: string,
) {
  const facts = await loadClassFacts(classId);
  if (!facts) throw new ActionError("That class no longer exists.");
  if (!user.isAdmin && !teachesSubjectIn(user, facts, subjectId)) {
    throw new ActionError("You can only set homework for subjects you teach in this class.");
  }
}

// Create or update; publishing (once) tells the class's guardians and students.
export const saveHomework = action(schema, async (input, { user, db }) => {
  await allowed(user, input.classId, input.subjectId);
  const existing = input.id
    ? await db.query.homework.findFirst({ where: eq(homework.id, input.id) })
    : null;
  if (input.id && !existing) throw new ActionError("That homework no longer exists.");
  if (existing && existing.createdByUserId !== user.id && !user.isAdmin) {
    throw new ActionError("Only the teacher who set this homework can change it.");
  }
  const values = {
    classId: input.classId,
    subjectId: input.subjectId,
    title: input.title,
    description: input.description,
    dueDate: input.dueDate,
  };
  const publishNow = input.publish && !existing?.publishedAt;
  const publishedAt = existing?.publishedAt ?? (input.publish ? new Date().toISOString() : null);
  let id: number;
  if (existing) {
    await db
      .update(homework)
      .set({ ...values, publishedAt })
      .where(eq(homework.id, existing.id));
    id = existing.id;
  } else {
    [{ id }] = await db
      .insert(homework)
      .values({ ...values, publishedAt, createdByUserId: user.id })
      .returning({ id: homework.id });
  }
  if (publishNow) {
    const [settings, cls, subject, audience] = await Promise.all([
      getSchoolSettings(),
      db.query.classes.findFirst({ columns: { name: true }, where: eq(classes.id, input.classId) }),
      db.query.subjects.findFirst({
        columns: { name: true },
        where: eq(subjects.id, input.subjectId),
      }),
      listClassAudience(input.classId),
    ]);
    const due = formatDate(input.dueDate, settings.timezone);
    const body = `${subject?.name} for ${cls?.name}: ${input.title}. Due ${due}.`;
    for (const person of audience) {
      const href =
        person.role === "guardian" ? `/family/${person.studentId}/homework` : "/student/homework";
      const url = await appUrl(href);
      await notify(db, {
        userId: person.userId,
        type: "homework.published",
        title: `New homework: ${input.title}`,
        body,
        href,
        email: () =>
          sendNotice(person, { title: `New homework: ${input.title}`, body, url }, settings.name),
      });
    }
  }
  revalidatePath("/teach/homework");
  revalidatePath("/family");
  revalidatePath("/student");
  return { id };
});

export const deleteHomework = action(
  z.object({ id: z.number().int() }),
  async (input, { user, db }) => {
    const existing = await db.query.homework.findFirst({ where: eq(homework.id, input.id) });
    if (!existing) throw new ActionError("That homework no longer exists.");
    await allowed(user, existing.classId, existing.subjectId);
    if (existing.createdByUserId !== user.id && !user.isAdmin) {
      throw new ActionError("Only the teacher who set this homework can delete it.");
    }
    await db.delete(homework).where(eq(homework.id, input.id));
    if (existing.publishedAt) {
      await audit(db, {
        actorUserId: user.id,
        action: "homework.delete",
        entityType: "homework",
        entityId: input.id,
        changes: { deleted: [existing.title, null] },
      });
    }
    revalidatePath("/teach/homework");
    revalidatePath("/family");
    revalidatePath("/student");
  },
);
