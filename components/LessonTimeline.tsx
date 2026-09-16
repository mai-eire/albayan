import { Group, Text, Timeline, TimelineItem } from "@mantine/core";
import { IconSun } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { SubjectBadge } from "@/components/SubjectBadge";

export type LessonItem = {
  key: string | number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName: string;
  // "Level 2 · Room 3"
  detail: string;
  actions?: ReactNode;
};

// Today's lessons (§4.10): past in tile, the one happening now in saffron with a sun,
// the rest in gray. `now` is "HH:MM" in the school timezone.
export function LessonTimeline({ lessons, now }: { lessons: LessonItem[]; now: string }) {
  const state = (l: LessonItem) =>
    now >= l.endTime ? "past" : now >= l.startTime ? "current" : "future";
  const lastPast = lessons.map(state).lastIndexOf("past");
  const current = lessons.findIndex((l) => state(l) === "current");
  return (
    <Timeline bulletSize={26} lineWidth={2} active={current >= 0 ? current : lastPast}>
      {lessons.map((l) => {
        const s = state(l);
        return (
          <TimelineItem
            key={l.key}
            color={s === "current" ? "saffron" : s === "past" ? "tile" : "gray"}
            bullet={s === "current" ? <IconSun size={14} stroke={2} /> : undefined}
            title={
              <Group gap="xs" wrap="wrap">
                <Text fw={600}>{l.startTime}</Text>
                <SubjectBadge subjectId={l.subjectId} name={l.subjectName} />
                <Text c="dimmed" size="sm">
                  {l.detail}
                </Text>
              </Group>
            }
          >
            {l.actions && (
              <Group gap="xs" mt={4}>
                {l.actions}
              </Group>
            )}
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
