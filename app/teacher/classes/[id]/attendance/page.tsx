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
import { clock } from "@/lib/clock";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { RegistersTable } from "@/components/RegistersTable";
import { TodayButton } from "@/components/TodayButton";
import { currentPeriod } from "@/lib/db/queries/academics";
import { listRegistersForTerm, summariseAttendance } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate, nextDateOn, todayIn } from "@/lib/time";
import { loadTeacherClass } from "../load";

type Props = { params: Promise<{ id: string }> };

// This term's registers, newest first — take today's, fill in a missed one — the same
// sheet as the Attendance page narrowed to this class, and the per-student counts underneath.
export default async function ClassAttendancePage({ params }: Props) {
  const [{ cls }, { timezone }] = await Promise.all([
    loadTeacherClass(params),
    getSchoolSettings(),
  ]);
  const today = todayIn(timezone, await clock());
  const period = await currentPeriod(today);
  const [summary, rows] = await Promise.all([
    period ? summariseAttendance(cls.id, period.from, period.to) : [],
    period
      ? (
          await listRegistersForTerm(
            cls.academicYearId,
            period.from,
            period.to < today ? period.to : today,
          )
        ).filter((r) => r.classId === cls.id)
      : [],
  ]);
  const byStudent = new Map(summary.map((s) => [s.studentId, s]));
  const next = nextDateOn(cls.session.dayOfWeek, today);
  return (
    <Stack gap="lg">
      <Card>
        <CardTitle
          context={
            <Group gap="sm">
              {next !== today && (
                <Text size="sm" c="dimmed">
                  Next lesson {formatDate(next, timezone)}
                </Text>
              )}
              {rows.length > 0 && <TodayButton today={today} size="sm" />}
            </Group>
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
        {rows.length === 0 ? (
          <Text size="sm" c="dimmed">
            No lessons yet this term.
          </Text>
        ) : (
          <RegistersTable
            rows={rows}
            hrefBase="/teacher/attendance"
            filters={["date", "register"]}
            showClass={false}
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
                      <AppLink href={`/teacher/students/${s.id}/attendance`} fw={500}>
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
