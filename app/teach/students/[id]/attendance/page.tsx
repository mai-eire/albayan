import {
  Card,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { Nothing } from "@/components/Nothing";
import { Figures } from "@/components/Figures";
import { StatusBadge } from "@/components/StatusBadge";
import { listAttendanceForStudent } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate } from "@/lib/time";
import { loadTeacherStudent } from "../load";

type Props = { params: Promise<{ id: string }> };

// Every register this student has been on, newest first, with the totals at the top.
export default async function TeacherStudentAttendancePage({ params }: Props) {
  const [{ student }, { timezone }] = await Promise.all([
    loadTeacherStudent(params),
    getSchoolSettings(),
  ]);
  const rows = await listAttendanceForStudent(student.id, 100);
  const n = (status: string) => rows.filter((r) => r.status === status).length;
  return (
    <Card>
      <CardTitle>Attendance</CardTitle>
      {rows.length === 0 ? (
        <Text size="sm" c="dimmed">
          No registers yet.
        </Text>
      ) : (
        <>
          <Figures
            items={[
              {
                label: "Present",
                value: n("present") + n("late"),
                hint: `of ${rows.length} lessons`,
              },
              { label: "Late", value: n("late") },
              { label: "Absent", value: n("absent"), color: n("absent") ? "clay" : undefined },
              { label: "Excused", value: n("excused") },
            ]}
          />
          <Table mt="lg">
            <TableThead>
              <TableTr>
                <TableTh>Date</TableTh>
                <TableTh>Session</TableTh>
                <TableTh>Attendance</TableTh>
                <TableTh>Note</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {rows.map((a) => (
                <TableTr key={a.date}>
                  <TableTd>{formatDate(a.date, timezone, true)}</TableTd>
                  <TableTd>{a.sessionName}</TableTd>
                  <TableTd>
                    <StatusBadge domain="attendance" value={a.status} />
                  </TableTd>
                  <TableTd>{a.note ?? <Nothing>no note</Nothing>}</TableTd>
                </TableTr>
              ))}
            </TableTbody>
          </Table>
        </>
      )}
    </Card>
  );
}
