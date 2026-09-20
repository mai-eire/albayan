"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canViewStudent, isStaff, loadStudentFacts } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { appUrl } from "@/lib/app-url";
import { audit } from "@/lib/audit";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import {
  guardians,
  noteCategories,
  noteVisibilities,
  studentGuardians,
  studentNotes,
  students,
  users,
} from "@/lib/db/schema";
import { sendNotice } from "@/lib/email";
import { notify } from "@/lib/notify";

// Notes are written from the teacher's and the admin's student pages, so they live here.

export const addNote = action(
  z.object({
    studentId: z.number().int(),
    body: z.string().trim().min(2, "Write the note").max(2000),
    category: z.enum(noteCategories),
    visibility: z.enum(noteVisibilities),
  }),
  async (input, { user, db }) => {
    if (!isStaff(user)) throw new ActionError("Only staff can add notes.");
    const facts = await loadStudentFacts(input.studentId);
    if (!facts || !canViewStudent(user, facts))
      throw new ActionError("You can't add notes for that student.");
    const [note] = await db
      .insert(studentNotes)
      .values({ ...input, authorUserId: user.id })
      .returning({ id: studentNotes.id });
    if (input.visibility !== "staff") {
      const [settings, student, contacts] = await Promise.all([
        getSchoolSettings(),
        db.query.students.findFirst({
          columns: { firstName: true },
          where: eq(students.id, input.studentId),
        }),
        db
          .select({ userId: users.id, name: users.name, email: users.email })
          .from(studentGuardians)
          .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
          .innerJoin(users, eq(users.id, guardians.userId))
          .where(eq(studentGuardians.studentId, input.studentId)),
      ]);
      const title = `A note about ${student?.firstName ?? "your child"}`;
      const href = `/family/${input.studentId}/notes`;
      const url = await appUrl(href);
      for (const c of contacts) {
        await notify(db, {
          userId: c.userId,
          type: "note.shared",
          title,
          body: `${user.name} wrote: ${input.body.slice(0, 140)}`,
          href,
          email: () =>
            sendNotice(c, { title, body: `${user.name} wrote: ${input.body}`, url }, settings.name),
        });
      }
    }
    revalidatePath(`/teacher/students/${input.studentId}`);
    revalidatePath(`/admin/students/${input.studentId}`);
    revalidatePath("/family");
    return { id: note.id };
  },
);

// Soft delete: the row stays for the audit trail, the note disappears everywhere.
export const deleteNote = action(
  z.object({ id: z.number().int() }),
  async (input, { user, db }) => {
    const existing = await db.query.studentNotes.findFirst({
      where: and(eq(studentNotes.id, input.id), isNull(studentNotes.deletedAt)),
    });
    if (!existing) throw new ActionError("That note no longer exists.");
    if (existing.authorUserId !== user.id && !user.isAdmin) {
      throw new ActionError("Only the person who wrote this note can remove it.");
    }
    await db
      .update(studentNotes)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(studentNotes.id, input.id));
    await audit(db, {
      actorUserId: user.id,
      action: "note.delete",
      entityType: "student_note",
      entityId: input.id,
      changes: { deleted: [existing.body, null] },
    });
    revalidatePath(`/teacher/students/${existing.studentId}`);
    revalidatePath(`/admin/students/${existing.studentId}`);
    revalidatePath("/family");
  },
);
