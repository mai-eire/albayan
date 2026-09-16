import { Stack } from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentYear, listClasses, listSessions } from "@/lib/db/queries/academics";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { listStudentsForAdmin, type StudentFilters } from "@/lib/db/queries/students";
import { studentStatuses } from "@/lib/db/schema";
import { todayIn } from "@/lib/time";
import { StudentFiltersBar } from "./StudentFiltersBar";
import { StudentsTable } from "./StudentsTable";

export const metadata = { title: "Students" };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function StudentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters: StudentFilters = {
    status: studentStatuses.find((s) => s === params.status) ?? "active",
    sessionId: params.session ? Number(params.session) : undefined,
    classId: params.class ? Number(params.class) : undefined,
    q: params.q?.trim() || undefined,
  };
  const [rows, year, { timezone }] = await Promise.all([
    listStudentsForAdmin(filters),
    getCurrentYear(),
    getSchoolSettings(),
  ]);
  const [sessions, classes] = year
    ? await Promise.all([listSessions(year.id), listClasses(year.id)])
    : [[], []];
  return (
    <Stack gap="lg" maw={1100}>
      <PageHeader title="Students" eyebrow={`${rows.length} shown`} />
      <StudentFiltersBar
        sessions={sessions.map((s) => ({ id: s.id, name: s.name }))}
        classes={classes.map((c) => ({ id: c.id, name: c.name, sessionId: c.sessionId }))}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={20} stroke={1.75} />}
          message="No students match. Try clearing a filter."
        />
      ) : (
        <StudentsTable rows={rows} today={todayIn(timezone)} />
      )}
    </Stack>
  );
}
