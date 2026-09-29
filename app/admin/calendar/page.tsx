import { Card, Stack, Text } from "@mantine/core";
import { IconCalendar } from "@tabler/icons-react";
import { CalendarViews } from "@/components/CalendarViews";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { PageHeader } from "@/components/PageHeader";
import { clock } from "@/lib/clock";
import { listClasses, listSessions, getCurrentYear } from "@/lib/db/queries/academics";
import { lessonDaysForSchool, listTermsForYear } from "@/lib/db/queries/calendar";
import { listEventsForAdmin } from "@/lib/db/queries/events";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { buildMonth } from "@/lib/calendar";
import { datesCovered } from "@/lib/events";
import { formatHijri, todayIn } from "@/lib/time";
import { EventsCard } from "./EventsCard";

export const metadata = { title: "Calendar" };

type Props = { searchParams: Promise<{ month?: string; view?: string }> };

// The calendar everyone else sees, with the school's own dates on it and the office's way
// of putting them there. Drafts show here and nowhere else.
export default async function AdminCalendarPage({ searchParams }: Props) {
  const [{ month, view }, { timezone }, year] = await Promise.all([
    searchParams,
    getSchoolSettings(),
    getCurrentYear(),
  ]);
  const today = todayIn(timezone, await clock());
  if (!year) {
    return (
      <Stack gap="lg" maw={960}>
        <PageHeader title="Calendar" />
        <EmptyState
          icon={<IconCalendar size={20} stroke={1.75} />}
          message="The calendar follows the academic year. Set one up under Academics first."
          action={<LinkButton href="/admin/academics/years">Go to Academics</LinkButton>}
        />
      </Stack>
    );
  }
  const [terms, lessonDays, events, sessions, classes] = await Promise.all([
    listTermsForYear(year.id),
    lessonDaysForSchool(year.id),
    listEventsForAdmin({ from: year.startDate, to: year.endDate }),
    listSessions(year.id),
    listClasses(year.id),
  ]);
  const shown = month && /^\d{4}-\d{2}$/.test(month) ? month : today.slice(0, 7);
  const built = buildMonth({
    month: shown,
    today,
    terms,
    lessonDays,
    events: events.flatMap((e) => datesCovered(e).map((date) => ({ date, title: e.title }))),
  });
  return (
    <Stack gap="lg" maw={960}>
      <PageHeader
        title="Calendar"
        eyebrow={formatHijri(new Date(), timezone)}
        subtitle={`Term dates, holidays and activities for ${year.id}`}
      />
      <Card>
        <CalendarViews
          month={built}
          base="/admin/calendar"
          initialView={view}
          events={events}
          today={today}
          timezone={timezone}
          showDrafts
          emptyMessage="Nothing on the calendar yet."
        />
        {terms.length === 0 && (
          <Text size="sm" c="dimmed" mt="md">
            Term dates haven&apos;t been set yet — add them under Academics.
          </Text>
        )}
      </Card>
      <EventsCard
        events={events}
        sessions={sessions.map((s) => ({ id: s.id, name: s.name }))}
        classes={classes.map((c) => ({ id: c.id, name: c.name, sessionName: c.sessionName }))}
        today={today}
        timezone={timezone}
      />
    </Stack>
  );
}
