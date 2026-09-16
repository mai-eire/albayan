"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  canViewStudent,
  isStaff,
  loadClassFacts,
  loadStudentFacts,
  requireAdmin,
  teachesClass,
  teachesSubjectIn,
} from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { appUrl } from "@/lib/app-url";
import { audit } from "@/lib/audit";
import { listClassAudience } from "@/lib/db/queries/homework";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { homework, resourceAudiences, resources } from "@/lib/db/schema";
import { sendNotice } from "@/lib/email";
import { optionalText } from "@/lib/fields";
import { notify } from "@/lib/notify";
import { deleteFile } from "@/lib/storage/bucket";

// Resources are shared from several places (admin's school-wide list, a class, a
// homework, a student), so the actions live here rather than under one route.

const target = z.union([
  z.object({ kind: z.literal("school") }),
  z.object({
    kind: z.literal("class"),
    classId: z.number().int(),
    subjectId: z.string().nullable(),
  }),
  z.object({ kind: z.literal("homework"), homeworkId: z.number().int() }),
  z.object({ kind: z.literal("student"), studentId: z.number().int() }),
]);

const schema = z.object({
  title: z.string().trim().min(2, "Give it a title").max(120),
  description: optionalText(1000),
  audience: z.enum(resourceAudiences),
  target,
  file: z
    .object({
      storageKey: z.string().min(1),
      mimeType: z.string().max(120),
      sizeBytes: z.number().int().nonnegative(),
    })
    .nullable(),
  url: z.string().trim().url("Enter a full link, starting with https://").nullable(),
});

export type ResourceInput = z.input<typeof schema>;
export type ResourceTarget = z.input<typeof target>;

export const createResource = action(schema, async (input, { user, db }) => {
  if (!isStaff(user)) throw new ActionError("Only staff can share resources.");
  if (!input.file === !input.url) throw new ActionError("Share either a file or a link.");

  // Who may attach to what; also resolves the class to notify.
  let classId: number | null = null;
  const t = input.target;
  if (t.kind === "school") requireAdmin(user);
  if (t.kind === "class") {
    const facts = await loadClassFacts(t.classId);
    if (!facts) throw new ActionError("That class no longer exists.");
    const ok =
      user.isAdmin ||
      (t.subjectId ? teachesSubjectIn(user, facts, t.subjectId) : teachesClass(user, facts));
    if (!ok) throw new ActionError("You can only share with classes you teach.");
    classId = t.classId;
  }
  if (t.kind === "homework") {
    const hw = await db.query.homework.findFirst({ where: eq(homework.id, t.homeworkId) });
    if (!hw) throw new ActionError("That homework no longer exists.");
    const facts = await loadClassFacts(hw.classId);
    if (!facts || (!user.isAdmin && !teachesSubjectIn(user, facts, hw.subjectId))) {
      throw new ActionError("You can only attach files to your own homework.");
    }
    classId = hw.classId;
  }
  if (t.kind === "student") {
    const facts = await loadStudentFacts(t.studentId);
    if (!facts || !canViewStudent(user, facts))
      throw new ActionError("You can't share with that student.");
  }

  const [created] = await db
    .insert(resources)
    .values({
      title: input.title,
      description: input.description,
      kind: input.file ? "file" : "link",
      storageKey: input.file?.storageKey ?? null,
      mimeType: input.file?.mimeType ?? null,
      sizeBytes: input.file?.sizeBytes ?? null,
      url: input.url,
      uploadedByUserId: user.id,
      audience: input.audience,
      isSchoolWide: t.kind === "school",
      classId: t.kind === "class" ? t.classId : null,
      subjectId: t.kind === "class" ? t.subjectId : null,
      homeworkId: t.kind === "homework" ? t.homeworkId : null,
      studentId: t.kind === "student" ? t.studentId : null,
    })
    .returning({ id: resources.id });

  // Families hear about class and homework resources; school-wide ones are reference
  // material and student ones are shared quietly with that family.
  if (classId !== null && input.audience !== "staff_only") {
    const [settings, audience] = await Promise.all([
      getSchoolSettings(),
      listClassAudience(classId),
    ]);
    for (const person of audience) {
      if (person.role === "student" && input.audience === "guardians_only") continue;
      const href =
        person.role === "guardian" ? `/family/${person.studentId}/resources` : "/student/resources";
      const url = await appUrl(href);
      await notify(db, {
        userId: person.userId,
        type: "resource.shared",
        title: `New resource: ${input.title}`,
        body: input.description ?? "Your teacher shared something new.",
        href,
        email: () =>
          sendNotice(
            person,
            {
              title: `New resource: ${input.title}`,
              body: input.description ?? "Your teacher shared something new.",
              url,
            },
            settings.name,
          ),
      });
    }
  }
  revalidatePath("/admin/resources");
  revalidatePath("/teach");
  revalidatePath("/family");
  revalidatePath("/student");
  return { id: created.id };
});

export const deleteResource = action(
  z.object({ id: z.number().int() }),
  async (input, { user, db }) => {
    const existing = await db.query.resources.findFirst({ where: eq(resources.id, input.id) });
    if (!existing) throw new ActionError("That resource no longer exists.");
    if (existing.uploadedByUserId !== user.id && !user.isAdmin) {
      throw new ActionError("Only the person who shared this can remove it.");
    }
    await db.delete(resources).where(eq(resources.id, input.id));
    if (existing.storageKey) await deleteFile(existing.storageKey);
    await audit(db, {
      actorUserId: user.id,
      action: "resource.delete",
      entityType: "resource",
      entityId: input.id,
      changes: { deleted: [existing.title, null] },
    });
    revalidatePath("/admin/resources");
    revalidatePath("/teach");
    revalidatePath("/family");
    revalidatePath("/student");
  },
);
