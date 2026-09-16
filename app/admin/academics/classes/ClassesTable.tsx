import { Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text } from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import type { ClassRow } from "@/lib/db/queries/academics";

export function ClassesTable({ classes }: { classes: ClassRow[] }) {
  return (
    <Table>
      <TableThead>
        <TableTr>
          <TableTh>Class</TableTh>
          <TableTh>Session</TableTh>
          <TableTh>Class teacher</TableTh>
          <TableTh>Room</TableTh>
          <TableTh ta="end">Students</TableTh>
        </TableTr>
      </TableThead>
      <TableTbody>
        {classes.map((c) => (
          <TableTr key={c.id}>
            <TableTd>
              <AppLink href={`/admin/academics/classes/${c.id}`} fw={600}>
                {c.name}
              </AppLink>
            </TableTd>
            <TableTd>{c.sessionName}</TableTd>
            <TableTd>{c.classTeacherName ?? <Text c="dimmed">—</Text>}</TableTd>
            <TableTd>{c.room ?? <Text c="dimmed">—</Text>}</TableTd>
            <TableTd ta="end">
              {c.studentCount}
              {c.capacity ? <Text component="span" c="dimmed">{` / ${c.capacity}`}</Text> : null}
            </TableTd>
          </TableTr>
        ))}
      </TableTbody>
    </Table>
  );
}
