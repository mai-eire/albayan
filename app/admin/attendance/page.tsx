import {
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
import { StatusBadge } from "@/components/StatusBadge";
import { getCurrentYear } from "@/lib/db/queries/academics";
import { listRegistersForDate } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate, todayIn } from "@/lib/time";
import { DatePicker } from "./DatePicker";

export const metadata = { title: "Attendance" };

type Props = { searchParams: Promise<{ date?: string }> };

export default async function AdminAttendancePage({ searchParams }: Props) {
  const [{ date: requested }, { timezone }, year] = await Promise.all([
    searchParams,
    getSchoolSettings(),
    getCurrentYear(),
  ]);
  const today = todayIn(timezone);
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
        actions={<DatePicker value={date} />}
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
              <TableTh>Day</TableTh>
              <TableTh>Students</TableTh>
              <TableTh>Absent</TableTh>
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
                  {r.sessionName} · {r.startTime}
                </TableTd>
                <TableTd>{r.studentCount}</TableTd>
                <TableTd>
                  {r.absentCount || (
                    <Text component="span" c="dimmed">
                      —
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
