import { Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text } from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { StatusBadge } from "@/components/StatusBadge";
import { ageOn } from "@/lib/age";
import type { StudentListRow } from "@/lib/db/queries/students";

export function StudentsTable({ rows, today }: { rows: StudentListRow[]; today: string }) {
  return (
    <Table>
      <TableThead>
        <TableTr>
          <TableTh>Student</TableTh>
          <TableTh>ID</TableTh>
          <TableTh>Class</TableTh>
          <TableTh>Guardian</TableTh>
          <TableTh>Status</TableTh>
        </TableTr>
      </TableThead>
      <TableTbody>
        {rows.map((s) => (
          <TableTr key={s.id}>
            <TableTd>
              <AppLink href={`/admin/students/${s.id}`} fw={500}>
                {s.firstName} {s.lastName}
              </AppLink>
              <Text size="sm" c="dimmed">
                {ageOn(s.dateOfBirth, today)} years
              </Text>
            </TableTd>
            <TableTd>
              <Text size="sm" c="dimmed">
                {s.studentId ?? "—"}
              </Text>
            </TableTd>
            <TableTd>
              {s.className ?? "—"}
              {s.sessionName && (
                <Text size="sm" c="dimmed">
                  {s.sessionName}
                </Text>
              )}
            </TableTd>
            <TableTd>{s.guardianName ?? "—"}</TableTd>
            <TableTd>
              <StatusBadge domain="application" value={s.status} />
            </TableTd>
          </TableTr>
        ))}
      </TableTbody>
    </Table>
  );
}
