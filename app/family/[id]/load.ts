import { notFound } from "next/navigation";
import { getStudentForGuardian } from "@/lib/db/queries/family";

// The layout has already checked access; each tab loads the same shape.
export async function loadChild(params: Promise<{ id: string }>) {
  const child = await getStudentForGuardian(Number((await params).id));
  if (!child) notFound();
  return child;
}
