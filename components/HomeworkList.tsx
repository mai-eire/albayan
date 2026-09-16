import { Stack, Text } from "@mantine/core";
import { EntityList } from "@/components/EntityList";
import { StatusBadge } from "@/components/StatusBadge";
import type { HomeworkRow } from "@/lib/db/queries/homework";
import { dueLabel, homeworkStatus } from "@/lib/homework";

// Homework as a family or student sees it (§4.6): one row each, due date in plain words,
// the teacher's instructions in the same line.
export function HomeworkList({
  rows,
  today,
  timezone,
}: {
  rows: HomeworkRow[];
  today: string;
  timezone: string;
}) {
  return (
    <Stack gap="md">
      <EntityList
        items={rows.map((h) => ({
          key: h.id,
          title: h.title,
          detail: `${h.subjectName} · ${dueLabel(h.dueDate, today, timezone)}${h.description ? ` — ${h.description}` : ""}`,
          badge: <StatusBadge domain="homework" value={homeworkStatus(h.dueDate, today)} />,
        }))}
      />
      {rows.some((h) => h.description) && (
        <Text size="xs" c="dimmed">
          Set by {[...new Set(rows.map((h) => h.createdByName))].join(", ")}.
        </Text>
      )}
    </Stack>
  );
}
