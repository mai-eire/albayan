import { Card, Stack, Text } from "@mantine/core";
import { IconCalendarTime } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { WeekTimetable } from "@/components/WeekTimetable";
import { requireArea } from "@/lib/access";
import { getCurrentYear } from "@/lib/db/queries/academics";
import { listDayForTeacher } from "@/lib/db/queries/teach";

export const metadata = { title: "Timetable" };

// My week: every lesson I teach, by day and time.
export default async function TeacherTimetablePage() {
  const [user, year] = await Promise.all([requireArea("teacher"), getCurrentYear()]);
  const byDay =
    user.teacher && year
      ? await Promise.all(
          [0, 1, 2, 3, 4, 5, 6].map(async (day) => ({
            day,
            ...(await listDayForTeacher(user.teacher!.id, year.id, day)),
          })),
        )
      : [];
  const lessons = byDay.flatMap(({ day, lessons }) =>
    lessons.map((l) => ({
      dayOfWeek: day,
      startTime: l.startTime,
      endTime: l.endTime,
      subjectId: l.subjectId,
      subjectName: l.subjectName,
      title: l.className,
      detail: [l.sessionName, l.room].filter(Boolean).join(" · "),
      href: `/teacher/classes/${l.classId}`,
    })),
  );
  const staffSlots = byDay.flatMap(({ day, staffSlots }) =>
    staffSlots.map((s) => ({
      dayOfWeek: day,
      startTime: s.startTime,
      endTime: s.endTime,
      subjectId: null,
      subjectName: s.title,
      title: s.title,
      detail: `${s.sessionName} · staff only`,
    })),
  );
  const hours = lessons.reduce((sum, l) => sum + minutesBetween(l.startTime, l.endTime), 0) / 60;
  return (
    <Stack gap="lg" maw={1100} mx="auto">
      <PageHeader
        title="My week"
        eyebrow={
          lessons.length
            ? `${lessons.length} ${lessons.length === 1 ? "lesson" : "lessons"} · ${hours % 1 ? hours.toFixed(1) : hours} hours a week`
            : year?.id
        }
      />
      {lessons.length === 0 ? (
        <EmptyState
          icon={<IconCalendarTime size={20} stroke={1.75} />}
          message="No lessons on your timetable yet. The office assigns classes and subjects."
        />
      ) : (
        <Card>
          <WeekTimetable lessons={[...lessons, ...staffSlots]} />
          <Text size="sm" c="dimmed" mt="md">
            Tap a lesson to open the class.
          </Text>
        </Card>
      )}
    </Stack>
  );
}

function minutesBetween(from: string, to: string): number {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  return th * 60 + tm - (fh * 60 + fm);
}
