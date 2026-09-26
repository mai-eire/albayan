import { Card, Stack, Text } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { EntityList } from "@/components/EntityList";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { requireArea } from "@/lib/access";
import { attendanceTally, listAttendanceForStudent } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate } from "@/lib/time";

export const metadata = { title: "Attendance" };

// Their own register, one row per date, newest first — the same shape their family sees.
export default async function StudentAttendancePage() {
  const [user, { timezone }] = await Promise.all([requireArea("student"), getSchoolSettings()]);
  const [recent, tally] = user.student
    ? await Promise.all([
        listAttendanceForStudent(user.student.id, 60),
        attendanceTally(user.student.id),
      ])
    : [[], { present: 0, total: 0 }];
  return (
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader
        title="Attendance"
        eyebrow={tally.total ? `Here for ${tally.present} of ${tally.total}` : undefined}
      />
      <Card>
        <CardTitle>Every class so far</CardTitle>
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
    </Stack>
  );
}
