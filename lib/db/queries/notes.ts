import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { studentNotes, users, type NoteCategory, type NoteVisibility } from "@/lib/db/schema";

export type Note = {
  id: number;
  body: string;
  category: NoteCategory;
  visibility: NoteVisibility;
  authorUserId: number;
  authorName: string;
  createdAt: string;
};

// One function per viewer, so the visibility rule is in the query and nowhere else.
async function list(studentId: number, visibilities: NoteVisibility[]): Promise<Note[]> {
  return (await db())
    .select({
      id: studentNotes.id,
      body: studentNotes.body,
      category: studentNotes.category,
      visibility: studentNotes.visibility,
      authorUserId: studentNotes.authorUserId,
      authorName: users.name,
      createdAt: studentNotes.createdAt,
    })
    .from(studentNotes)
    .innerJoin(users, eq(users.id, studentNotes.authorUserId))
    .where(
      and(
        eq(studentNotes.studentId, studentId),
        isNull(studentNotes.deletedAt),
        inArray(studentNotes.visibility, visibilities),
      ),
    )
    .orderBy(desc(studentNotes.createdAt), desc(studentNotes.id));
}

export const listNotesForStaff = (studentId: number) =>
  list(studentId, ["staff", "guardians", "guardians_and_student"]);
export const listNotesForGuardian = (studentId: number) =>
  list(studentId, ["guardians", "guardians_and_student"]);
export const listNotesForStudent = (studentId: number) =>
  list(studentId, ["guardians_and_student"]);
