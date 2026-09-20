import { Card } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { listSessions, listSubjects, listTeachers } from "@/lib/db/queries/academics";
import { ClassForm } from "../ClassForm";
import { loadClass } from "./load";

type Props = { params: Promise<{ id: string }> };

export default async function ClassDetailsPage({ params }: Props) {
  const cls = await loadClass(params);
  const [sessions, teachers, subjects] = await Promise.all([
    listSessions(cls.academicYearId),
    listTeachers(),
    listSubjects(),
  ]);
  const classTeacherSubjects = cls.assignments
    .filter((a) => a.teacherId === cls.classTeacherId)
    .map((a) => subjects.find((s) => s.id === a.subjectId)?.name ?? a.subjectId)
    .sort();
  return (
    <Card>
      <CardTitle>Details</CardTitle>
      <ClassForm
        sessions={sessions}
        teachers={teachers}
        existing={{ ...cls, classTeacherSubjects }}
      />
    </Card>
  );
}
