import { Card, Stack, Text } from "@mantine/core";
import { IconClipboardCheck } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { EntityList } from "@/components/EntityList";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { requireArea } from "@/lib/access";
import { getCurrentYear } from "@/lib/db/queries/academics";
import { listRegistersForDate } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { listClassesForTeacher } from "@/lib/db/queries/teach";
import { dayOfWeekIn, formatDate, todayIn } from "@/lib/time";

export const metadata = { title: "Attendance" };

// Today's registers for my classes. Other days are reached from the class page.
export default async function TeacherAttendancePage() {
  const [user, { timezone }, year] = await Promise.all([
    requireArea("teach"),
    getSchoolSettings(),
    getCurrentYear(),
  ]);
  const today = todayIn(timezone);
  const mine = user.teacher && year ? await listClassesForTeacher(user.teacher.id, year.id) : [];
  const registers = year
    ? await listRegistersForDate(
        year.id,
        today,
        dayOfWeekIn(timezone),
        mine.map((c) => c.id),
      )
    : [];
  return (
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader eyebrow={formatDate(today, timezone)} title="Registers" />
      {registers.length === 0 ? (
        <EmptyState
          icon={<IconClipboardCheck size={20} stroke={1.75} />}
          message="None of your classes meet today."
        />
      ) : (
        <Card>
          <EntityList
            items={registers.map((r) => ({
              key: r.classId,
              title: r.className,
              detail: `${r.sessionName} · ${r.startTime} · ${r.studentCount} students${r.absentCount ? ` · ${r.absentCount} absent` : ""}`,
              badge:
                r.recordedCount >= r.studentCount && r.studentCount > 0 ? (
                  <StatusBadge domain="register" value="taken" />
                ) : (
                  <StatusBadge domain="register" value="missing" />
                ),
              href: `/teach/attendance/${r.classId}?date=${today}`,
            }))}
          />
          <Text size="sm" c="dimmed" mt="md">
            Registers can be changed until the end of the day; after that, ask the office.
          </Text>
        </Card>
      )}
    </Stack>
  );
}
