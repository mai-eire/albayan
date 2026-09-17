import {
  Group,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { IconClipboardCheck } from "@tabler/icons-react";
import { AppLink } from "@/components/AppLink";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { LinkButton } from "@/components/LinkButton";
import { StatusBadge } from "@/components/StatusBadge";
import { TermTable } from "./TermTable";
import {
  currentPeriod,
  getCurrentYear,
  listClasses,
  listSessions,
} from "@/lib/db/queries/academics";
import { listRegistersForDate, listRegistersForTerm } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate, todayIn } from "@/lib/time";
import tabular from "@/components/tabular.module.css";
import { DatePicker } from "./DatePicker";

export const metadata = { title: "Attendance" };

type Props = { searchParams: Promise<{ date?: string; view?: string }> };

export default async function AdminAttendancePage({ searchParams }: Props) {
  const [{ date: requested, view }, { timezone }, year] = await Promise.all([
    searchParams,
    getSchoolSettings(),
    getCurrentYear(),
  ]);
  const today = todayIn(timezone);
  if (view === "term") return <TermView today={today} timezone={timezone} yearId={year?.id} />;
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;
  const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();
  const registers = year ? await listRegistersForDate(year.id, date, dayOfWeek) : [];
  const missing = registers.filter((r) => r.recordedCount < r.studentCount).length;
  return (
    <Stack gap="lg" maw={960}>
      <PageHeader
        title="Attendance"
        eyebrow={
          registers.length
            ? missing
              ? `${missing} of ${registers.length} registers still to come`
              : "All registers in"
            : undefined
        }
        actions={
          <>
            <ViewSwitch view="day" />
            <DatePicker value={date} />
          </>
        }
      />
      {registers.length === 0 ? (
        <EmptyState
          icon={<IconClipboardCheck size={20} stroke={1.75} />}
          message={`No classes on ${formatDate(date, timezone)}.`}
        />
      ) : (
        <Table>
          <TableThead>
            <TableTr>
              <TableTh>Class</TableTh>
              <TableTh>Session</TableTh>
              <TableTh ta="end">Present</TableTh>
              <TableTh>Register</TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            {registers.map((r) => (
              <TableTr key={r.classId}>
                <TableTd>
                  <AppLink href={`/admin/attendance/${r.classId}?date=${date}`} fw={500}>
                    {r.className}
                  </AppLink>
                </TableTd>
                <TableTd>
                  {r.sessionName} {r.startTime}–{r.endTime}
                </TableTd>
                <TableTd ta="end" className={tabular.tabular}>
                  {r.recordedCount ? (
                    <>
                      <Text component="span" c={r.absentCount ? "clay" : undefined} fw={500}>
                        {r.recordedCount - r.absentCount}
                      </Text>
                      <Text component="span" c="dimmed">
                        {" "}
                        / {r.studentCount}
                      </Text>
                    </>
                  ) : (
                    <Text component="span" c="dimmed">
                      {r.studentCount} students
                    </Text>
                  )}
                </TableTd>
                <TableTd>
                  {r.studentCount === 0 ? (
                    <Text size="sm" c="dimmed">
                      Empty class
                    </Text>
                  ) : r.recordedCount >= r.studentCount ? (
                    <StatusBadge domain="register" value="taken" />
                  ) : (
                    <StatusBadge domain="register" value="missing" />
                  )}
                </TableTd>
              </TableTr>
            ))}
          </TableTbody>
        </Table>
      )}
    </Stack>
  );
}

// The whole term at a glance: every lesson × class, newest first.
async function TermView({
  today,
  timezone,
  yearId,
}: {
  today: string;
  timezone: string;
  yearId: string | undefined;
}) {
  const period = yearId ? await currentPeriod(today) : null;
  const [rows, sessions, classes] =
    yearId && period
      ? await Promise.all([
          listRegistersForTerm(yearId, period.from, period.to < today ? period.to : today),
          listSessions(yearId),
          listClasses(yearId),
        ])
      : [[], [], []];
  const missing = rows.filter((r) => r.studentCount > 0 && r.recordedCount < r.studentCount);
  return (
    <Stack gap="lg" maw={1100}>
      <PageHeader
        title="Attendance"
        eyebrow={
          period
            ? missing.length
              ? `${period.label} · ${missing.length} of ${rows.length} registers still to come`
              : `${period.label} · all ${rows.length} registers in`
            : undefined
        }
        actions={<ViewSwitch view="term" />}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconClipboardCheck size={20} stroke={1.75} />}
          message="No lessons yet this term."
        />
      ) : (
        <TermTable
          rows={rows}
          sessions={sessions}
          classes={classes.map((c) => ({ id: c.id, name: c.name, sessionId: c.sessionId }))}
          timezone={timezone}
        />
      )}
    </Stack>
  );
}

// Day view answers "who hasn't taken today's register?"; term view "who keeps missing it?".
function ViewSwitch({ view }: { view: "day" | "term" }) {
  return (
    <Group gap={4}>
      <LinkButton href="/admin/attendance" variant={view === "day" ? "light" : "subtle"} size="sm">
        By day
      </LinkButton>
      <LinkButton
        href="/admin/attendance?view=term"
        variant={view === "term" ? "light" : "subtle"}
        size="sm"
      >
        This term
      </LinkButton>
    </Group>
  );
}
