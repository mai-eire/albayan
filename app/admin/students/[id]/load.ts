import { notFound } from "next/navigation";
import { getStudentForAdmin } from "@/lib/db/queries/students";

// Each tab page loads the same profile; the request-level cache in db() keeps it cheap.
export async function loadStudent(params: Promise<{ id: string }>) {
  const student = await getStudentForAdmin(Number((await params).id));
  if (!student) notFound();
  return student;
}
