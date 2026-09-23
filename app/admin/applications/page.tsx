import { Stack } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { PageHeader } from "@/components/PageHeader";
import { clock } from "@/lib/clock";
import {
  classChoice,
  getCurrentYear,
  listClasses,
  listSessions,
  listYears,
} from "@/lib/db/queries/academics";
import { listApplications } from "@/lib/db/queries/applications";
import { familyOverviewFor } from "@/lib/db/queries/families";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";
import { YearPicker } from "../academics/YearPicker";
import { ApplicationsTable } from "./ApplicationsTable";

export const metadata = { title: "Applications" };

type Props = { searchParams: Promise<{ year?: string }> };

// Every application for the year, whatever became of it; the filters start on the ones
// still waiting. The year navigates (it needs different rows); the rest filter in the browser.
export default async function ApplicationsPage({ searchParams }: Props) {
  const [{ year: requested }, years, current, { timezone }] = await Promise.all([
    searchParams,
    listYears(),
    getCurrentYear(),
    getSchoolSettings(),
  ]);
  const year = years.find((y) => y.id === requested) ?? current ?? years[0] ?? null;
  const applications = year ? await listApplications({ yearId: year.id }) : [];
  const [classes, sessions, families] = await Promise.all([
    year ? listClasses(year.id) : [],
    year ? listSessions(year.id) : [],
    familyOverviewFor(
      applications.map((a) => a.id),
      year?.id ?? null,
    ),
  ]);
  const waiting = applications.filter((a) => a.status === "applied").length;
  const today = todayIn(timezone, await clock());
  return (
    <Stack gap="lg" maw={1180}>
      <PageHeader
        title="Applications"
        eyebrow={waiting ? `${waiting} waiting` : undefined}
        actions={year && <YearPicker years={years} value={year.id} />}
      />
      {!year ? (
        <EmptyState
          icon={<IconInbox size={20} stroke={1.75} />}
          message="Applications follow the academic year. Set one up under Academics first."
          action={<LinkButton href="/admin/academics/years">Go to Academics</LinkButton>}
        />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<IconInbox size={20} stroke={1.75} />}
          message={`No applications for ${year.id} yet. New ones will appear here.`}
        />
      ) : (
        <ApplicationsTable
          applications={applications}
          classes={classes.map(classChoice)}
          sessions={sessions.map((s) => ({ id: s.id, name: s.name }))}
          families={Object.fromEntries(families)}
          standardFeeCents={year.standardFeeCents}
          today={today}
        />
      )}
    </Stack>
  );
}
