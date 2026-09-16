import { Card, Stack } from "@mantine/core";
import { notFound } from "next/navigation";
import { CardTitle } from "@/components/CardTitle";
import { PageHeader } from "@/components/PageHeader";
import {
  currentPeriod,
  getClass,
  listClasses,
  listRosterForAdmin,
  listSessions,
  listTeachers,
} from "@/lib/db/queries/academics";
import { summariseAttendance } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";
import { RosterCard } from "./RosterCard";
import { ClassForm } from "../ClassForm";
import { DeleteClassButton } from "./DeleteClassButton";
import { TeachersCard } from "./TeachersCard";

type Props = { params: Promise<{ id: string }> };

export default async function ClassPage({ params }: Props) {
  const id = Number((await params).id);
  const cls = await getClass(id);
  if (!cls) notFound();
  const [sessions, teachers, roster, allClasses, { timezone }] = await Promise.all([
    listSessions(cls.academicYearId),
    listTeachers(),
    listRosterForAdmin(id),
    listClasses(cls.academicYearId),
    getSchoolSettings(),
  ]);
  const today = todayIn(timezone);
  const period = await currentPeriod(today);
  const attendance = period ? await summariseAttendance(id, period.from, period.to) : [];
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
      <RosterCard
        roster={roster}
        attendance={attendance}
        periodLabel={period?.label ?? null}
        otherClasses={allClasses
          .filter((c) => c.id !== cls.id)
          .map((c) => ({ id: c.id, name: c.name, sessionName: c.sessionName }))}
        today={today}
      />
    </Stack>
  );
}
