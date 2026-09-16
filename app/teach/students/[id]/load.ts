import { notFound } from "next/navigation";
import { canViewStudent, loadStudentFacts, requireArea } from "@/lib/access";
import { getStudentForTeacher } from "@/lib/db/queries/teach";

// Every tab of a teacher's student page: the teacher, the access check, the limited shape.
export async function loadTeacherStudent(params: Promise<{ id: string }>) {
  const id = Number((await params).id);
  const [user, facts] = await Promise.all([requireArea("teach"), loadStudentFacts(id)]);
  if (!facts || !canViewStudent(user, facts)) notFound();
  const student = await getStudentForTeacher(id);
  if (!student) notFound();
  return { user, student };
}
