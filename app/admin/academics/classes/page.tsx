import { Group, Stack } from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { listClasses, listSessions, listTeachers, listYears } from "@/lib/db/queries/academics";
import { YearPicker } from "../YearPicker";
import { AddClassButton } from "./ClassForm";
import { ClassesList } from "./ClassesList";

export const metadata = { title: "Classes" };

type Props = { searchParams: Promise<{ year?: string }> };

export default async function ClassesPage({ searchParams }: Props) {
  const [years, { year }] = await Promise.all([listYears(), searchParams]);
  const yearId = year ?? years.find((y) => y.isCurrent)?.id ?? years[0]?.id;
  if (!yearId) {
    return (
      <Stack gap="lg">
        <PageHeader title="Classes" />
        <EmptyState
          icon={<IconUsers size={20} stroke={1.75} />}
          message="Add an academic year and its sessions first."
        />
      </Stack>
    );
  }
  const [classes, sessions, teachers] = await Promise.all([
    listClasses(yearId),
    listSessions(yearId),
    listTeachers(),
  ]);
  return (
    <Stack gap="lg">
      <PageHeader
        title="Classes"
        actions={
          <Group gap="sm">
            <YearPicker years={years} value={yearId} />
            {sessions.length > 0 && <AddClassButton sessions={sessions} teachers={teachers} />}
          </Group>
        }
      />
      <ClassesList
        classes={classes}
        sessions={sessions}
        teachers={teachers.filter((t) => classes.some((c) => c.teacherIds.includes(t.id)))}
        emptyMessage={
          sessions.length
            ? `No classes in ${yearId} yet.`
            : `Add a session to ${yearId} before its classes.`
        }
      />
    </Stack>
  );
}
