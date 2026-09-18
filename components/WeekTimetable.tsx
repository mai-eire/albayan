import { SimpleGrid, Stack, Text } from "@mantine/core";
import { SubjectBadge } from "@/components/SubjectBadge";
import { subjectColor } from "@/lib/subjects";
import { weekdays } from "@/lib/timetable";
import classes from "./WeekTimetable.module.css";

export type WeekLesson = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  // Null for a staff-only slot: a gray block with its title.
  subjectId: string | null;
  subjectName: string;
  title: string;
  detail?: string | null;
  href?: string;
};

// A week as columns, one per day that has lessons (§4.10): each block is tinted with its
// subject and carries the time, the class and the room.
export function WeekTimetable({ lessons }: { lessons: WeekLesson[] }) {
  const days = [1, 2, 3, 4, 5, 6, 0].filter((d) => lessons.some((l) => l.dayOfWeek === d));
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
      {days.map((day) => (
        <Stack key={day} gap="xs">
          <Text fw={600}>{weekdays[day]}</Text>
          {lessons
            .filter((l) => l.dayOfWeek === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((l, i) => {
              const color = l.subjectId ? subjectColor(l.subjectId) : "gray";
              const body = (
                <>
                  <Text size="xs" c="dimmed" className={classes.time}>
                    {l.startTime}–{l.endTime}
                  </Text>
                  <Text fw={600} size="sm">
                    {l.title}
                  </Text>
                  {l.subjectId && (
                    <SubjectBadge subjectId={l.subjectId} name={l.subjectName} size="xs" />
                  )}
                  {l.detail && (
                    <Text size="xs" c="dimmed">
                      {l.detail}
                    </Text>
                  )}
                </>
              );
              const style = {
                "--block-color": `var(--mantine-color-${color}-6)`,
                "--block-color-bright": `var(--mantine-color-${color}-4)`,
                "--block-tint": `var(--mantine-color-${color}-0)`,
              } as React.CSSProperties;
              return l.href ? (
                <a key={i} href={l.href} className={classes.block} style={style}>
                  {body}
                </a>
              ) : (
                <div key={i} className={classes.block} style={style}>
                  {body}
                </div>
              );
            })}
        </Stack>
      ))}
    </SimpleGrid>
  );
}
