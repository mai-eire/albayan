import { Card, Stack, Text } from "@mantine/core";
import { CalendarViews } from "@/components/CalendarViews";
import { PageHeader } from "@/components/PageHeader";
import { buildMonth, type LessonDay } from "@/lib/calendar";
import { getCurrentYear } from "@/lib/db/queries/academics";
import { listTermsForYear } from "@/lib/db/queries/calendar";
import { listEventsForViewer, type ViewerScope } from "@/lib/db/queries/events";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { datesCovered } from "@/lib/events";
import { formatHijri, todayIn } from "@/lib/time";

// The calendar page every area shares: term days, the viewer's lesson days and the school's
// dates, as a month or as the year's schedule. `month` comes from ?month=YYYY-MM and the
// view from ?view=schedule.
export async function CalendarPage({
  base,
  month,
  view,
  lessonDays,
  scope,
}: {
  base: string;
  month?: string;
  view?: string;
  lessonDays: LessonDay[];
  // Which sessions and classes the viewer belongs to, so a Sunday family is not told about
  // a Saturday trip. No scope at all still sees whole-school entries.
  scope: ViewerScope;
}) {
  const [{ timezone }, year] = await Promise.all([getSchoolSettings(), getCurrentYear()]);
  const today = todayIn(timezone);
  const terms = year ? await listTermsForYear(year.id) : [];
  const shown = month && /^\d{4}-\d{2}$/.test(month) ? month : today.slice(0, 7);
  const events = year
    ? await listEventsForViewer({ from: year.startDate, to: year.endDate }, scope)
    : [];
  const built = buildMonth({
    month: shown,
    today,
    terms,
    lessonDays,
    events: events.flatMap((e) =>
      datesCovered(e).map((date) => ({ id: e.id, date, title: e.title, type: e.type })),
    ),
  });
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader title="Calendar" eyebrow={formatHijri(new Date(), timezone)} />
      <Card>
        <CalendarViews
          month={built}
          base={base}
          initialView={view}
          events={events}
          today={today}
          timezone={timezone}
          emptyMessage="Nothing on the calendar yet. Term dates, holidays and trips appear here."
        />
        {terms.length === 0 && (
          <Text size="sm" c="dimmed" mt="md">
            Term dates haven&apos;t been set yet.
          </Text>
        )}
      </Card>
    </Stack>
  );
}
