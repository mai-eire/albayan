import { notFound } from "next/navigation";
import { loadClassFacts, requireArea, teachesClass } from "@/lib/access";
import { getClassForTeacher } from "@/lib/db/queries/teach";

// Every tab of a teacher's class page: the signed-in teacher, the access check, the class.
export async function loadTeacherClass(params: Promise<{ id: string }>) {
  const id = Number((await params).id);
  const [user, facts] = await Promise.all([requireArea("teach"), loadClassFacts(id)]);
  if (!facts || !teachesClass(user, facts)) notFound();
  const cls = await getClassForTeacher(id);
  if (!cls) notFound();
  return { user, facts, cls };
}
