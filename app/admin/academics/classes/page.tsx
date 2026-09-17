import { Group, Stack } from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { listClasses, listSessions, listTeachers, listYears } from "@/lib/db/queries/academics";
import { YearPicker } from "../YearPicker";
import { ClassFilters } from "./ClassFilters";
import { AddClassButton } from "./ClassForm";
import { ClassesTable } from "./ClassesTable";

export const metadata = { title: "Classes" };

type Props = {
  searchParams: Promise<{ year?: string; session?: string; teacher?: string; q?: string }>;
};

export default async function ClassesPage({ searchParams }: Props) {
  const [years, params] = await Promise.all([listYears(), searchParams]);
  const { year } = params;
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
  const q = params.q?.trim().toLowerCase();
  const shown = classes.filter(
    (c) =>
      (!params.session || c.sessionId === Number(params.session)) &&
      (!params.teacher || c.teacherIds.includes(Number(params.teacher))) &&
      (!q || c.name.toLowerCase().includes(q)),
  );
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
      {classes.length > 0 && (
        <ClassFilters
          sessions={sessions}
          teachers={teachers.filter((t) => classes.some((c) => c.teacherIds.includes(t.id)))}
        />
      )}
      {shown.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={20} stroke={1.75} />}
          message={
            classes.length
              ? "No classes match these filters."
              : sessions.length
                ? `No classes in ${yearId} yet.`
                : `Add a session to ${yearId} before its classes.`
          }
        />
      ) : (
        <ClassesTable classes={shown} />
      )}
    </Stack>
  );
}
