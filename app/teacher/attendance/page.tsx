import { clock } from "@/lib/clock";
import { Stack } from "@mantine/core";
import { IconClipboardCheck } from "@tabler/icons-react";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { isTaken } from "@/components/RegisterCells";
import { RegistersTable } from "@/components/RegistersTable";
import { TodayButton } from "@/components/TodayButton";
import { requireArea } from "@/lib/access";
import { currentPeriod, getCurrentYear } from "@/lib/db/queries/academics";
import { listRegistersForTerm } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { listClassesForTeacher } from "@/lib/db/queries/teach";
import { todayIn } from "@/lib/time";

export const metadata = { title: "Attendance" };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

// This term's registers for my classes — the office's sheet without the teacher column.
// Arriving with no filter on a day my classes meet lands on today's registers.
export default async function TeacherAttendancePage({ searchParams }: Props) {
  const [user, { timezone }, year, params] = await Promise.all([
    requireArea("teacher"),
    getSchoolSettings(),
    getCurrentYear(),
    searchParams,
  ]);
  const today = todayIn(timezone, await clock());
  const period = year ? await currentPeriod(today) : null;
  const mine = user.teacher && year ? await listClassesForTeacher(user.teacher.id, year.id) : [];
  const rows =
    year && period && mine.length
      ? (
          await listRegistersForTerm(year.id, period.from, period.to < today ? period.to : today)
        ).filter((r) => mine.some((c) => c.id === r.classId))
      : [];
  if (Object.keys(params).length === 0 && rows.some((r) => r.date === today)) {
    redirect(`/teacher/attendance?date=${today}`);
  }
  const missing = rows.filter((r) => r.studentCount > 0 && !isTaken(r));
  const sessions = [...new Map(mine.map((c) => [c.sessionId, c.sessionName])).entries()].map(
    ([id, name]) => ({ id, name }),
  );
  return (
    <Stack gap="lg" maw={1180} mx="auto">
      <PageHeader
        title="Attendance"
        subtitle={
          period
            ? `${period.label} · ${
                missing.length
                  ? `${missing.length} of ${rows.length} registers still to come`
                  : `all ${rows.length} registers in`
              }`
            : undefined
        }
        actions={rows.length > 0 && <TodayButton today={today} />}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconClipboardCheck size={20} stroke={1.75} />}
          message={mine.length ? "No lessons yet this term." : "You're not teaching a class yet."}
        />
      ) : (
        <RegistersTable
          rows={rows}
          hrefBase="/teacher/attendance"
          filters={["date", "session", "class", "register"]}
          showTeacher={false}
          sessions={sessions}
          classes={mine.map((c) => ({
            id: c.id,
            name: c.name,
            sessionId: c.sessionId,
            sessionName: c.sessionName,
          }))}
        />
      )}
    </Stack>
  );
}
