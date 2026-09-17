import {
  Card,
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
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { EntityList } from "@/components/EntityList";
import { StatusBadge } from "@/components/StatusBadge";
import { lessonDatesBetween } from "@/lib/calendar";
import { currentPeriod } from "@/lib/db/queries/academics";
import { countRegisterRows, summariseAttendance } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate, nextDateOn, todayIn } from "@/lib/time";
import { loadTeacherClass } from "../load";

type Props = { params: Promise<{ id: string }> };

// This term's registers, newest first — take today's, fill in a missed one — and the
// per-student counts underneath.
export default async function ClassAttendancePage({ params }: Props) {
  const [{ cls }, { timezone }] = await Promise.all([
    loadTeacherClass(params),
    getSchoolSettings(),
  ]);
  const today = todayIn(timezone);
  const period = await currentPeriod(today);
  const dates = period
    ? lessonDatesBetween(cls.session.dayOfWeek, period.from, period.to < today ? period.to : today)
    : [];
  const [summary, counts] = await Promise.all([
    period ? summariseAttendance(cls.id, period.from, period.to) : [],
    countRegisterRows(cls.id, dates),
  ]);
  const byStudent = new Map(summary.map((s) => [s.studentId, s]));
  const next = nextDateOn(cls.session.dayOfWeek, today);
  return (
    <Stack gap="lg">
      <Card>
        <CardTitle
          context={
            next !== today && (
              <Text size="sm" c="dimmed">
                Next lesson {formatDate(next, timezone)}
              </Text>
            )
          }
        >
          Registers
          {period && (
            <Text component="span" c="dimmed" fw={400}>
              {" "}
              {period.label}
            </Text>
          )}
        </CardTitle>
        {dates.length === 0 ? (
          <Text size="sm" c="dimmed">
            No lessons yet this term.
          </Text>
        ) : (
          <EntityList
            items={[...dates].reverse().map((date) => {
              const n = counts.get(date) ?? 0;
              return {
                key: date,
                title: formatDate(date, timezone),
                detail:
                  date === today
                    ? "Today"
                    : n
                      ? `${n} of ${cls.roster.length} recorded`
                      : undefined,
                badge:
                  n >= cls.roster.length && cls.roster.length > 0 ? (
                    <StatusBadge domain="register" value="taken" />
                  ) : (
                    <StatusBadge domain="register" value="missing" />
                  ),
                href: `/teach/attendance/${cls.id}?date=${date}`,
              };
            })}
          />
        )}
      </Card>
      {summary.length > 0 && (
        <Card>
          <CardTitle>
            <Group gap="xs">
              By student
              {period && (
                <Text component="span" c="dimmed" fw={400}>
                  {period.label}
                </Text>
              )}
            </Group>
          </CardTitle>
          <Table>
            <TableThead>
              <TableTr>
                <TableTh>Name</TableTh>
                <TableTh ta="end">Present</TableTh>
                <TableTh ta="end">Late</TableTh>
                <TableTh ta="end">Absent</TableTh>
                <TableTh ta="end">Excused</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {cls.roster.map((s) => {
                const a = byStudent.get(s.id);
                return (
                  <TableTr key={s.id}>
                    <TableTd>
                      <AppLink href={`/teach/students/${s.id}/attendance`} fw={500}>
                        {s.firstName} {s.lastName}
                      </AppLink>
                    </TableTd>
                    <TableTd ta="end">{a?.present ?? 0}</TableTd>
                    <TableTd ta="end">{a?.late ?? 0}</TableTd>
                    <TableTd ta="end" c={a?.absent ? "clay" : undefined}>
                      {a?.absent ?? 0}
                    </TableTd>
                    <TableTd ta="end">{a?.excused ?? 0}</TableTd>
                  </TableTr>
                );
              })}
            </TableTbody>
          </Table>
        </Card>
      )}
    </Stack>
  );
}
