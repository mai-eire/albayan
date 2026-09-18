import { Group, Text, Timeline, TimelineItem } from "@mantine/core";
import { SubjectBadge } from "@/components/SubjectBadge";
import { subjectColor } from "@/lib/subjects";
import { timePeriods } from "@/lib/timetable";

export type TimetablePeriod = {
  subjectId: string | null;
  subjectName?: string | null;
  title: string | null;
  durationMinutes: number;
  // Only on staff timetables: the page filters these out for families (lib/timetable.ts).
  staffOnly?: boolean;
  // Shown under a subject: the teacher's name, or whatever the page wants to say.
  detail?: string | null;
};

// A class's day as a Timeline (§4.10): start time and subject per period, breaks by
// title. Times are computed from the session start and the period lengths.
export function ClassTimetable({
  startTime,
  periods,
}: {
  startTime: string;
  periods: TimetablePeriod[];
}) {
  const timed = timePeriods(startTime, periods);
  return (
    <Timeline bulletSize={26} lineWidth={2} active={timed.length - 1}>
      {timed.map((p, i) => (
        <TimelineItem
          key={i}
          color={p.subjectId ? subjectColor(p.subjectId) : "gray"}
          title={
            <Group gap="xs">
              <Text fw={600}>{p.startTime}</Text>
              {p.subjectId ? (
                <SubjectBadge subjectId={p.subjectId} name={p.subjectName ?? p.subjectId} />
              ) : (
                <Text c={p.staffOnly ? "dimmed" : undefined}>{p.title}</Text>
              )}
            </Group>
          }
        >
          <Text size="sm" c="dimmed">
            {p.subjectId
              ? (p.detail ?? "No teacher yet")
              : `until ${p.endTime}${p.staffOnly ? " · staff only" : ""}`}
          </Text>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
