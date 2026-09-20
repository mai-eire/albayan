import { clock } from "@/lib/clock";
import { Stack } from "@mantine/core";
import { IconClipboardCheck } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { isTaken } from "@/components/RegisterCells";
import { RegistersTable } from "@/components/RegistersTable";
import { TodayButton } from "@/components/TodayButton";
import {
  currentPeriod,
  getCurrentYear,
  listClasses,
  listSessions,
  listTeachers,
} from "@/lib/db/queries/academics";
import { listRegistersForTerm } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";

export const metadata = { title: "Attendance" };

// This term's registers, one row per lesson × class, filtered in the browser: the date
// filter narrows to a day, a month or a weekday, "Today" to today's.
export default async function AdminAttendancePage() {
  const [{ timezone }, year] = await Promise.all([getSchoolSettings(), getCurrentYear()]);
  const today = todayIn(timezone, await clock());
  const period = year ? await currentPeriod(today) : null;
  const [rows, sessions, classes, teachers] =
    year && period
      ? await Promise.all([
          listRegistersForTerm(year.id, period.from, period.to < today ? period.to : today),
          listSessions(year.id),
          listClasses(year.id),
          listTeachers(),
        ])
      : [[], [], [], []];
  const missing = rows.filter((r) => r.studentCount > 0 && !isTaken(r));
  return (
    <Stack gap="lg" maw={1180}>
      <PageHeader
        title="Attendance"
        subtitle={
          period
            ? `${period.label} · ${
                missing.length
                  ? `${missing.length} of ${rows.length} registers not taken`
                  : `all ${rows.length} registers in`
              }`
            : undefined
        }
        actions={rows.length > 0 && <TodayButton today={today} />}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconClipboardCheck size={20} stroke={1.75} />}
          message="No lessons yet this term."
        />
      ) : (
        <RegistersTable
          rows={rows}
          hrefBase="/admin/attendance"
          teachers={teachers
            .filter((t) => rows.some((r) => r.teacherIds.includes(t.id)))
            .map((t) => ({ id: t.id, name: t.name }))}
          sessions={sessions}
          classes={classes.map((c) => ({
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
