"use client";

import { Table } from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { LinkRow } from "@/components/LinkRow";
import type { RegisterSummary } from "@/lib/db/queries/attendance";
import { PresentCell, RegisterCell } from "./RegisterCells";

// One row per class running that day; the whole row opens the register.
export function DayTable({ registers, date }: { registers: RegisterSummary[]; date: string }) {
  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Class</Table.Th>
          <Table.Th>Session</Table.Th>
          <Table.Th ta="end">Present</Table.Th>
          <Table.Th>Register</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {registers.map((r) => {
          const href = `/admin/attendance/${r.classId}?date=${date}`;
          return (
            <LinkRow key={r.classId} href={href}>
              <Table.Td>
                <AppLink href={href} fw={500}>
                  {r.className}
                </AppLink>
              </Table.Td>
              <Table.Td>
                {r.sessionName} ({r.startTime}–{r.endTime})
              </Table.Td>
              <PresentCell r={r} />
              <RegisterCell r={r} />
            </LinkRow>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
