import { Card, Text } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { EntityList } from "@/components/EntityList";
import { StatusBadge } from "@/components/StatusBadge";
import { attendanceTally, listAttendanceForStudent } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate } from "@/lib/time";
import { loadChild } from "../load";

type Props = { params: Promise<{ id: string }> };

// One row per date, newest first (§4.6) — a register is a day, so a day is a row.
export default async function ChildAttendancePage({ params }: Props) {
  const [child, { timezone }] = await Promise.all([loadChild(params), getSchoolSettings()]);
  const [recent, tally] = await Promise.all([
    listAttendanceForStudent(child.id, 60),
    attendanceTally(child.id),
  ]);
  return (
    <Card>
      <CardTitle
        context={
          tally.total > 0 && (
            <Text size="sm" c="dimmed">
              Here for {tally.present} of {tally.total}
            </Text>
          )
        }
      >
        Attendance
      </CardTitle>
      {recent.length === 0 ? (
        <Text c="dimmed">No registers taken yet.</Text>
      ) : (
        <EntityList
          items={recent.map((a) => ({
            key: a.date,
            title: formatDate(a.date, timezone, true),
            detail: a.note ?? undefined,
            badge: <StatusBadge domain="attendance" value={a.status} />,
          }))}
        />
      )}
    </Card>
  );
}
