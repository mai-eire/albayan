import { NotesCard } from "@/components/NotesCard";
import { requireArea } from "@/lib/access";
import { listNotesForStaff } from "@/lib/db/queries/notes";
import { loadStudent } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function StudentNotesPage({ params }: Props) {
  const [student, user] = await Promise.all([loadStudent(params), requireArea("admin")]);
  const notes = await listNotesForStaff(student.id);
  return (
    <NotesCard
      studentId={student.id}
      firstName={student.firstName}
      notes={notes}
      currentUserId={user.id}
      isAdmin
    />
  );
}
