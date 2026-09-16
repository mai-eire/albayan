import {
  Card,
  Group,
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
import { LinkButton } from "@/components/LinkButton";
import { currentPeriod } from "@/lib/db/queries/academics";
import { summariseAttendance } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";
import { loadTeacherClass } from "../load";

type Props = { params: Promise<{ id: string }> };

// Per-student counts for the current term; the day-by-day registers live under
// /teach/attendance.
export default async function ClassAttendancePage({ params }: Props) {
  const [{ cls }, { timezone }] = await Promise.all([
    loadTeacherClass(params),
    getSchoolSettings(),
  ]);
  const today = todayIn(timezone);
  const period = await currentPeriod(today);
  const summary = period ? await summariseAttendance(cls.id, period.from, period.to) : [];
  const byStudent = new Map(summary.map((s) => [s.studentId, s]));
  return (
    <Card>
      <CardTitle
        context={
          <LinkButton href={`/teach/attendance/${cls.id}?date=${today}`} variant="light" size="xs">
            Today&apos;s register
          </LinkButton>
        }
      >
        <Group gap="xs">
          Attendance
          {period && (
            <Text component="span" c="dimmed" fw={400}>
              {period.label}
            </Text>
          )}
        </Group>
      </CardTitle>
      {summary.length === 0 ? (
        <Text size="sm" c="dimmed">
          No registers taken yet this term.
        </Text>
      ) : (
        <Table>
          <TableThead>
            <TableTr>
              <TableTh>Name</TableTh>
              <TableTh>Present</TableTh>
              <TableTh>Late</TableTh>
              <TableTh>Absent</TableTh>
              <TableTh>Excused</TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            {cls.roster.map((s) => {
              const a = byStudent.get(s.id);
              return (
                <TableTr key={s.id}>
                  <TableTd>
                    <AppLink href={`/teach/students/${s.id}`} fw={500}>
                      {s.firstName} {s.lastName}
                    </AppLink>
                  </TableTd>
                  <TableTd>{a?.present ?? 0}</TableTd>
                  <TableTd>{a?.late ?? 0}</TableTd>
                  <TableTd c={a?.absent ? "clay" : undefined}>{a?.absent ?? 0}</TableTd>
                  <TableTd>{a?.excused ?? 0}</TableTd>
                </TableTr>
              );
            })}
          </TableTbody>
        </Table>
      )}
    </Card>
  );
}
