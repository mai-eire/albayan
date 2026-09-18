import { Card } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { listSessions, listTeachers } from "@/lib/db/queries/academics";
import { ClassForm } from "../ClassForm";
import { loadClass } from "./load";

type Props = { params: Promise<{ id: string }> };

export default async function ClassDetailsPage({ params }: Props) {
  const cls = await loadClass(params);
  const [sessions, teachers] = await Promise.all([
    listSessions(cls.academicYearId),
    listTeachers(),
  ]);
  return (
    <Card>
      <CardTitle>Details</CardTitle>
      <ClassForm sessions={sessions} teachers={teachers} existing={cls} />
    </Card>
  );
}
