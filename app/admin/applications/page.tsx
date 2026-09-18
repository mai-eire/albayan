import { Stack } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { classChoice, getCurrentYear, listClasses, listSessions } from "@/lib/db/queries/academics";
import { listApplications } from "@/lib/db/queries/applications";
import { familyOverviewFor } from "@/lib/db/queries/families";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";
import { ApplicationsTable } from "./ApplicationsTable";

export const metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  const [applications, year, { timezone }] = await Promise.all([
    listApplications(),
    getCurrentYear(),
    getSchoolSettings(),
  ]);
  const [classes, sessions, families] = await Promise.all([
    year ? listClasses(year.id) : [],
    year ? listSessions(year.id) : [],
    familyOverviewFor(
      applications.map((a) => a.id),
      year?.id ?? null,
    ),
  ]);
  return (
    <Stack gap="lg" maw={1180}>
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
          classes={classes.map(classChoice)}
          sessions={sessions.map((s) => ({ id: s.id, name: s.name }))}
          families={Object.fromEntries(families)}
          standardFeeCents={year?.standardFeeCents ?? 0}
          today={todayIn(timezone)}
        />
      )}
    </Stack>
  );
}
