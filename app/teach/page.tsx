import { Card, Stack, Text } from "@mantine/core";
import { IconSun } from "@tabler/icons-react";
import { CardTitle } from "@/components/CardTitle";
import { EmptyState } from "@/components/EmptyState";
import { LessonTimeline } from "@/components/LessonTimeline";
import { LinkButton } from "@/components/LinkButton";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";
import { getCurrentYear } from "@/lib/db/queries/academics";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { listDayForTeacher } from "@/lib/db/queries/teach";
import { dayOfWeekIn, formatDate, formatHijri, greeting, timeIn, todayIn } from "@/lib/time";

export const metadata = { title: "Today" };

// One block: today's lessons with their inline actions (DESIGN §3.3 worked example).
export default async function TeachToday() {
  const [user, { timezone }, year] = await Promise.all([
    requireArea("teach"),
    getSchoolSettings(),
    getCurrentYear(),
  ]);
  const now = new Date();
  const { lessons, staffSlots } =
    user.teacher && year
      ? await listDayForTeacher(user.teacher.id, year.id, dayOfWeekIn(timezone, now))
      : { lessons: [], staffSlots: [] };
  const today = todayIn(timezone, now);
  const registers = new Set<number>();
  const items = [
    ...lessons.map((l, i) => {
      const first = l.canTakeRegister && !registers.has(l.classId);
      if (first) registers.add(l.classId);
      return {
        key: `l${i}`,
        startTime: l.startTime,
        endTime: l.endTime,
        subjectId: l.subjectId,
        subjectName: l.subjectName,
        detail: [l.className, l.room].filter(Boolean).join(" · "),
        actions: first ? (
          <LinkButton
            href={`/teach/attendance/${l.classId}?date=${today}`}
            variant="light"
            size="xs"
          >
            Take register
          </LinkButton>
        ) : undefined,
      };
    }),
    ...staffSlots.map((s, i) => ({
      key: `s${i}`,
      startTime: s.startTime,
      endTime: s.endTime,
      subjectId: null,
      subjectName: s.title,
      detail: `${s.sessionName} · staff only`,
    })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));
  return (
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader
        eyebrow={`${formatDate(now, timezone)} · ${formatHijri(now, timezone)}`}
        title={`${greeting(timezone, now)}, ${user.name.split(" ")[0]}`}
      />
      {items.length === 0 ? (
        <EmptyState icon={<IconSun size={20} stroke={1.75} />} message="No lessons today." />
      ) : (
        <Card>
          <CardTitle>Today&apos;s lessons</CardTitle>
          <LessonTimeline now={timeIn(timezone, now)} lessons={items} />
          <Text size="sm" c="dimmed" mt="md">
            No homework due today.
          </Text>
        </Card>
      )}
    </Stack>
  );
}
