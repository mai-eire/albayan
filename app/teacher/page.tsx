import { clock } from "@/lib/clock";
import { Card, Group, Stack, Text } from "@mantine/core";
import { IconSun } from "@tabler/icons-react";
import { CardTitle } from "@/components/CardTitle";
import { EmptyState } from "@/components/EmptyState";
import { AppLink } from "@/components/AppLink";
import { LessonTimeline } from "@/components/LessonTimeline";
import { SubjectBadge } from "@/components/SubjectBadge";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";
import { getCurrentYear } from "@/lib/db/queries/academics";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { listHomeworkForTeacher } from "@/lib/db/queries/homework";
import { listDayForTeacher } from "@/lib/db/queries/teach";
import { dayOfWeekIn, formatDate, formatHijri, greeting, timeIn, todayIn } from "@/lib/time";
import { TakeRegisterButton, type RegisterToTake } from "./TakeRegisterButton";

export const metadata = { title: "Today" };

// One block: today's schedule — my lessons and the staff slots — with the register for the
// class I lead as the page's action (DESIGN §3.3 worked example).
export default async function TeachToday() {
  const [user, { timezone }, year] = await Promise.all([
    requireArea("teacher"),
    getSchoolSettings(),
    getCurrentYear(),
  ]);
  const now = await clock();
  const today = todayIn(timezone, now);
  const [{ lessons, staffSlots, registers: duties }, homework] =
    user.teacher && year
      ? await Promise.all([
          listDayForTeacher(user.teacher.id, year.id, dayOfWeekIn(timezone, now)),
          listHomeworkForTeacher(user.teacher.id, year.id),
        ])
      : [{ lessons: [], staffSlots: [], registers: [] }, []];
  // Published homework on my subjects that falls due today.
  const due = homework.filter((h) => h.publishedAt && h.dueDate === today);
  // The classes I lead that meet today — from the class, not the timetable, so a class
  // teacher with no subject of their own in the class still has the register to take.
  const registers: RegisterToTake[] = duties.map((d) => ({
    ...d,
    href: `/teacher/attendance/${d.classId}?date=${today}`,
  }));
  const items = [
    ...lessons.map((l, i) => ({
      key: `l${i}`,
      startTime: l.startTime,
      endTime: l.endTime,
      subjectId: l.subjectId,
      subjectName: l.subjectName,
      detail: [l.className, l.room].filter(Boolean).join(" · "),
    })),
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
        actions={registers.length > 0 && <TakeRegisterButton registers={registers} />}
      />
      {items.length === 0 ? (
        <EmptyState icon={<IconSun size={20} stroke={1.75} />} message="Nothing on today." />
      ) : (
        <Card>
          <CardTitle>Today&apos;s schedule</CardTitle>
          <LessonTimeline now={timeIn(timezone, now)} lessons={items} />
        </Card>
      )}
      {due.length > 0 && (
        <Card>
          <CardTitle>Homework due today</CardTitle>
          <Stack gap="xs">
            {due.map((h) => (
              <Group key={h.id} gap="xs">
                <AppLink href="/teacher/homework" fw={500}>
                  {h.title}
                </AppLink>
                <Text size="sm" c="dimmed">
                  {h.className}
                </Text>
                <SubjectBadge subjectId={h.subjectId} name={h.subjectName} />
              </Group>
            ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
