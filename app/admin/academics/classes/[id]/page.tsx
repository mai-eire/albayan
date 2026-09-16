import { Card, Stack } from "@mantine/core";
import { notFound } from "next/navigation";
import { CardTitle } from "@/components/CardTitle";
import { PageHeader } from "@/components/PageHeader";
import { getClass, listSessions, listTeachers } from "@/lib/db/queries/academics";
import { ClassForm } from "../ClassForm";
import { DeleteClassButton } from "./DeleteClassButton";
import { TeachersCard } from "./TeachersCard";

type Props = { params: Promise<{ id: string }> };

export default async function ClassPage({ params }: Props) {
  const id = Number((await params).id);
  const cls = await getClass(id);
  if (!cls) notFound();
  const [sessions, teachers] = await Promise.all([
    listSessions(cls.academicYearId),
    listTeachers(),
  ]);
  return (
    <Stack gap="lg" maw={860}>
      <PageHeader
        eyebrow={`${cls.academicYearId} · ${cls.session.name}`}
        title={cls.name}
        actions={<DeleteClassButton id={cls.id} name={cls.name} studentCount={cls.studentCount} />}
      />
      <Card>
        <CardTitle>Details</CardTitle>
        <ClassForm sessions={sessions} teachers={teachers} existing={cls} />
      </Card>
      <TeachersCard cls={cls} teachers={teachers} />
    </Stack>
  );
}
