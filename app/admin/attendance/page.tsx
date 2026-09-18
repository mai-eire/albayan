import { Group, Stack } from "@mantine/core";
import { IconClipboardCheck } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { PageHeader } from "@/components/PageHeader";
import {
  currentPeriod,
  getCurrentYear,
  listClasses,
  listSessions,
  listTeachers,
} from "@/lib/db/queries/academics";
import { listRegistersForDate, listRegistersForTerm } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate, todayIn } from "@/lib/time";
import { DatePicker } from "./DatePicker";
import { DayTable } from "./DayTable";
import { isTaken } from "./RegisterCells";
import { TermTable } from "./TermTable";

export const metadata = { title: "Attendance" };

type Props = { searchParams: Promise<{ date?: string; view?: string }> };

// Term view answers "who keeps missing the register?"; day view "who hasn't taken today's?".
// Both share one header: the title, the standing summary under it, and the view switch in
// the same place; only the day view has a date to pick.
export default async function AdminAttendancePage({ searchParams }: Props) {
  const [{ date: requested, view }, { timezone }, year] = await Promise.all([
    searchParams,
    getSchoolSettings(),
    getCurrentYear(),
  ]);
  const today = todayIn(timezone);
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;
  const byDay = view === "day";
  const controls = (
    <Group gap="sm">
      {byDay && <DatePicker value={date} />}
      <Group gap={4}>
        <LinkButton
          href="/admin/attendance?view=day"
          variant={byDay ? "light" : "subtle"}
          size="sm"
        >
          By day
        </LinkButton>
        <LinkButton href="/admin/attendance" variant={byDay ? "subtle" : "light"} size="sm">
          This term
        </LinkButton>
      </Group>
    </Group>
  );

  if (byDay) {
    const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();
    const registers = year ? await listRegistersForDate(year.id, date, dayOfWeek) : [];
    const missing = registers.filter((r) => r.studentCount > 0 && !isTaken(r)).length;
    return (
      <Stack gap="lg" maw={1180}>
        <PageHeader
          title="Attendance"
          subtitle={`${formatDate(date, timezone)} · ${
            registers.length === 0
              ? "no classes"
              : missing
                ? `${missing} of ${registers.length} registers still to come`
                : "all registers in"
          }`}
          actions={controls}
        />
        {registers.length === 0 ? (
          <EmptyState
            icon={<IconClipboardCheck size={20} stroke={1.75} />}
            message={`No classes on ${formatDate(date, timezone)}.`}
          />
        ) : (
          <DayTable registers={registers} date={date} />
        )}
      </Stack>
    );
  }

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
                  ? `${missing.length} of ${rows.length} registers still to come`
                  : `all ${rows.length} registers in`
              }`
            : undefined
        }
        actions={controls}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconClipboardCheck size={20} stroke={1.75} />}
          message="No lessons yet this term."
        />
      ) : (
        <TermTable
          rows={rows}
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
