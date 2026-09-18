import { listTeachers } from "@/lib/db/queries/academics";
import { TeachersCard } from "../TeachersCard";
import { loadClass } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function ClassTeachersPage({ params }: Props) {
  const [cls, teachers] = await Promise.all([loadClass(params), listTeachers()]);
  return <TeachersCard cls={cls} teachers={teachers} />;
}
