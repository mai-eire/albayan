import { Card, Group, Text } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { StatusBadge } from "@/components/StatusBadge";
import { listAttendanceForStudent } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate } from "@/lib/time";
import { loadTeacherStudent } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function TeacherStudentAttendancePage({ params }: Props) {
  const [{ student }, { timezone }] = await Promise.all([
    loadTeacherStudent(params),
    getSchoolSettings(),
  ]);
  const recent = await listAttendanceForStudent(student.id, 30);
  return (
    <Card>
      <CardTitle>Attendance</CardTitle>
      {recent.length === 0 ? (
        <Text size="sm" c="dimmed">
          No registers yet.
        </Text>
      ) : (
        <Group gap="sm" wrap="wrap">
          {recent.map((a) => (
            <Group key={a.date} gap={6} wrap="nowrap">
              <StatusBadge domain="attendance" value={a.status} />
              <Text size="sm" c="dimmed">
                {formatDate(a.date, timezone)}
                {a.note && ` · ${a.note}`}
              </Text>
            </Group>
          ))}
        </Group>
      )}
    </Card>
  );
}
