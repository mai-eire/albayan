import { Card, Stack, Text } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { MonthCalendar } from "@/components/MonthCalendar";
import { buildMonth, type LessonDay } from "@/lib/calendar";
import { getCurrentYear } from "@/lib/db/queries/academics";
import { listTermsForYear } from "@/lib/db/queries/calendar";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatHijri, todayIn } from "@/lib/time";

// The calendar page every area shares: terms and the viewer's lesson days for one month.
// Events join in Phase 3. `month` comes from ?month=YYYY-MM.
export async function CalendarPage({
  base,
  month,
  lessonDays,
}: {
  base: string;
  month?: string;
  lessonDays: LessonDay[];
}) {
  const [{ timezone }, year] = await Promise.all([getSchoolSettings(), getCurrentYear()]);
  const today = todayIn(timezone);
  const terms = year ? await listTermsForYear(year.id) : [];
  const shown = month && /^\d{4}-\d{2}$/.test(month) ? month : today.slice(0, 7);
  const built = buildMonth({ month: shown, today, terms, lessonDays });
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader title="Calendar" eyebrow={formatHijri(new Date(), timezone)} />
      <Card>
        <MonthCalendar month={built} base={base} />
        {terms.length === 0 && (
          <Text size="sm" c="dimmed" mt="md">
            Term dates haven&apos;t been set yet.
          </Text>
        )}
      </Card>
    </Stack>
  );
}
