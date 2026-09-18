import { notFound } from "next/navigation";
import { getClass } from "@/lib/db/queries/academics";

// Each tab loads the same class; the request-level cache keeps it cheap.
export async function loadClass(params: Promise<{ id: string }>) {
  const cls = await getClass(Number((await params).id));
  if (!cls) notFound();
  return cls;
}
