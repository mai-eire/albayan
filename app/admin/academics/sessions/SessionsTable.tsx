import { Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text } from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { StatusBadge } from "@/components/StatusBadge";
import type { SessionRow } from "@/lib/db/queries/academics";
import { sessionEndTime, weekdays } from "@/lib/timetable";

export function SessionsTable({ sessions }: { sessions: SessionRow[] }) {
  return (
    <Table>
      <TableThead>
        <TableTr>
          <TableTh>Session</TableTh>
          <TableTh>When</TableTh>
          <TableTh>Periods</TableTh>
          <TableTh>Classes</TableTh>
          <TableTh>Status</TableTh>
        </TableTr>
      </TableThead>
      <TableTbody>
        {sessions.map((s) => (
          <TableTr key={s.id}>
            <TableTd>
              <AppLink href={`/admin/academics/sessions/${s.id}`} fw={600}>
                {s.name}
              </AppLink>
            </TableTd>
            <TableTd>
              <Text size="sm">
                {weekdays[s.dayOfWeek]} {s.startTime}–{sessionEndTime(s.startTime, s.periods)}
              </Text>
            </TableTd>
            <TableTd>{s.periods.length}</TableTd>
            <TableTd>{s.classCount}</TableTd>
            <TableTd>
              <StatusBadge domain="record" value={s.isActive ? "active" : "inactive"} />
            </TableTd>
          </TableTr>
        ))}
      </TableTbody>
    </Table>
  );
}
