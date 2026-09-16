import { Card, Stack } from "@mantine/core";
import { notFound } from "next/navigation";
import { CardTitle } from "@/components/CardTitle";
import { PageHeader } from "@/components/PageHeader";
import { getSession, listSubjects } from "@/lib/db/queries/academics";
import { weekdays } from "@/lib/timetable";
import { SessionForm } from "../SessionForm";
import { DeleteSessionButton } from "./DeleteSessionButton";
import { ScheduleEditor } from "./ScheduleEditor";

type Props = { params: Promise<{ id: string }> };

export default async function SessionPage({ params }: Props) {
  const id = Number((await params).id);
  const [session, subjects] = await Promise.all([getSession(id), listSubjects()]);
  if (!session) notFound();
  return (
    <Stack gap="lg" maw={860}>
      <PageHeader
        eyebrow={`${session.academicYearId} · ${weekdays[session.dayOfWeek]}`}
        title={session.name}
        actions={
          <DeleteSessionButton
            id={session.id}
            name={session.name}
            classCount={session.classCount}
          />
        }
      />
      <Card>
        <CardTitle>Details</CardTitle>
        <SessionForm academicYearId={session.academicYearId} existing={session} />
      </Card>
      <ScheduleEditor
        sessionId={session.id}
        startTime={session.startTime}
        periods={session.periods.map((p) => ({
          subjectId: p.subjectId,
          title: p.title,
          durationMinutes: p.durationMinutes,
        }))}
        subjects={subjects.filter(
          (s) => s.isActive || session.periods.some((p) => p.subjectId === s.id),
        )}
      />
    </Stack>
  );
}
