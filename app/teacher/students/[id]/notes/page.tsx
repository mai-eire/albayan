import { NotesCard } from "@/components/NotesCard";
import { listNotesForStaff } from "@/lib/db/queries/notes";
import { loadTeacherStudent } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function TeacherStudentNotesPage({ params }: Props) {
  const { user, student } = await loadTeacherStudent(params);
  const notes = await listNotesForStaff(student.id);
  return (
    <NotesCard
      studentId={student.id}
      firstName={student.firstName}
      notes={notes}
      currentUserId={user.id}
      isAdmin={user.isAdmin}
    />
  );
}
