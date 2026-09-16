import { Card, Group, Text } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { StatusBadge } from "@/components/StatusBadge";
import { listAttendanceForStudent } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate } from "@/lib/time";
import { loadChild } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function ChildAttendancePage({ params }: Props) {
  const [child, { timezone }] = await Promise.all([loadChild(params), getSchoolSettings()]);
  const recent = await listAttendanceForStudent(child.id, 30);
  return (
    <Card>
      <CardTitle>Attendance</CardTitle>
      {recent.length === 0 ? (
        <Text c="dimmed">No registers taken yet.</Text>
      ) : (
        <Group gap="sm" wrap="wrap">
          {recent.map((a) => (
            <Group key={a.date} gap={6} wrap="nowrap">
              <StatusBadge domain="attendance" value={a.status} size="md" />
              <Text c="dimmed">{formatDate(a.date, timezone)}</Text>
            </Group>
          ))}
        </Group>
      )}
    </Card>
  );
}
