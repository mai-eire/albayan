import { Group, Stack, Text } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { listSessions, listYears } from "@/lib/db/queries/academics";
import { YearPicker } from "../YearPicker";
import { AddSessionButton } from "./SessionForm";
import { SessionsTable } from "./SessionsTable";

export const metadata = { title: "Sessions" };

type Props = { searchParams: Promise<{ year?: string }> };

export default async function SessionsPage({ searchParams }: Props) {
  const [years, { year }] = await Promise.all([listYears(), searchParams]);
  const yearId = year ?? years.find((y) => y.isCurrent)?.id ?? years[0]?.id;
  if (!yearId) {
    return (
      <Stack gap="lg">
        <PageHeader title="Sessions" />
        <EmptyState
          icon={<IconClock size={20} stroke={1.75} />}
          message="Add an academic year first, then its sessions."
        />
      </Stack>
    );
  }
  const sessions = await listSessions(yearId);
  return (
    <Stack gap="lg">
      <PageHeader
        title="Sessions"
        eyebrow="A session is a weekly slot, like Saturday 10:00, with its own schedule"
        actions={
          <Group gap="sm">
            <YearPicker years={years} value={yearId} />
            <AddSessionButton academicYearId={yearId} />
          </Group>
        }
      />
      {sessions.length === 0 ? (
        <EmptyState
          icon={<IconClock size={20} stroke={1.75} />}
          message={`No sessions in ${yearId} yet.`}
        />
      ) : (
        <SessionsTable sessions={sessions} />
      )}
      <Text size="xs" c="dimmed">
        All classes in a session share its schedule. Teachers are assigned per class under Classes.
      </Text>
    </Stack>
  );
}
