import { Stack } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentYear, listClasses, listSessions } from "@/lib/db/queries/academics";
import { listApplications } from "@/lib/db/queries/applications";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";
import { ApplicationsTable, type Placement } from "./ApplicationsTable";

export const metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  const [applications, year, { timezone }] = await Promise.all([
    listApplications(),
    getCurrentYear(),
    getSchoolSettings(),
  ]);
  const [sessions, classes] = year
    ? await Promise.all([listSessions(year.id), listClasses(year.id)])
    : [[], []];
  const placements: Placement[] = sessions
    .filter((s) => s.isActive)
    .map((s) => ({
      id: s.id,
      name: s.name,
      classes: classes.filter((c) => c.sessionId === s.id).map((c) => ({ id: c.id, name: c.name })),
    }));
  return (
    <Stack gap="lg" maw={1100}>
      <PageHeader
        title="Applications"
        eyebrow={applications.length ? `${applications.length} waiting` : undefined}
      />
      {applications.length === 0 ? (
        <EmptyState
          icon={<IconInbox size={20} stroke={1.75} />}
          message="No applications waiting. New ones will appear here."
        />
      ) : (
        <ApplicationsTable
          applications={applications}
          placements={placements}
          standardFeeCents={year?.standardFeeCents ?? 0}
          today={todayIn(timezone)}
        />
      )}
    </Stack>
  );
}
