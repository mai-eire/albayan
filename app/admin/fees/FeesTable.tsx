"use client";

import { Table, Text } from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { Nothing } from "@/components/Nothing";
import { MoneyText } from "@/components/MoneyText";
import { SortableTh, useSort } from "@/components/SortableTh";
import { StatusBadge } from "@/components/StatusBadge";
import type { FeeAccountRow } from "@/lib/db/queries/fees";

type Key = "student" | "class" | "guardian" | "fee" | "paid" | "balance";

// Who owes what, biggest balance first; any column re-sorts.
export function FeesTable({ rows }: { rows: FeeAccountRow[] }) {
  const { sort, toggle, sorted } = useSort<Key, FeeAccountRow>(
    rows,
    (a, key) => {
      switch (key) {
        case "student":
          return `${a.enrolment.lastName} ${a.enrolment.firstName}`;
        case "class":
          return `${a.enrolment.sessionName} ${a.enrolment.className}`;
        case "guardian":
          return a.enrolment.guardianName;
        case "fee":
          return a.feeCents;
        case "paid":
          return a.paidCents;
        case "balance":
          return a.balanceCents;
      }
    },
    { key: "balance", direction: "desc" },
  );
  const th = (label: string, key: Key, ta?: "end") => (
    <SortableTh label={label} sortKey={key} sort={sort} onSort={toggle} ta={ta} />
  );
  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          {th("Student", "student")}
          {th("Class", "class")}
          {th("Guardian", "guardian")}
          {th("Fee", "fee", "end")}
          {th("Paid", "paid", "end")}
          {th("Balance", "balance", "end")}
          <Table.Th>Status</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {sorted.map(({ enrolment: e, ...a }) => (
          <Table.Tr key={e.studentId}>
            <Table.Td>
              <AppLink href={`/admin/students/${e.studentId}/fees`} fw={500}>
                {e.firstName} {e.lastName}
              </AppLink>
              <Text size="xs" c="dimmed">
                {e.studentCode}
              </Text>
            </Table.Td>
            <Table.Td>
              {e.className} · {e.sessionName}
            </Table.Td>
            <Table.Td>
              {e.guardianId ? (
                <AppLink href={`/admin/guardians/${e.guardianId}/payments`}>
                  {e.guardianName}
                </AppLink>
              ) : (
                <Nothing>no guardian</Nothing>
              )}
            </Table.Td>
            <Table.Td ta="end">
              <MoneyText cents={a.feeCents} />
              {e.feeNote && (
                <Text size="xs" c="dimmed">
                  {e.feeNote}
                </Text>
              )}
            </Table.Td>
            <Table.Td ta="end">
              <MoneyText cents={a.paidCents} />
            </Table.Td>
            <Table.Td ta="end">
              {a.balanceCents < 0 ? (
                <MoneyText cents={-a.balanceCents} fw={500} c="tile" />
              ) : (
                <MoneyText cents={a.balanceCents} fw={500} />
              )}
              {a.balanceCents < 0 && (
                <Text size="xs" c="tile">
                  In credit
                </Text>
              )}
            </Table.Td>
            <Table.Td>
              <StatusBadge domain="fee" value={a.status} />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
