"use client";

import { Table, Text } from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { SortableTh, useSort } from "@/components/SortableTh";
import { StatusBadge } from "@/components/StatusBadge";
import { ageOn } from "@/lib/age";
import type { StudentListRow } from "@/lib/db/queries/students";

type Key = "name" | "id" | "age" | "class" | "guardian";

// One line per student (§4.5); any column re-sorts.
export function StudentsTable({ rows, today }: { rows: StudentListRow[]; today: string }) {
  const { sort, toggle, sorted } = useSort<Key, StudentListRow>(
    rows,
    (s, key) => {
      switch (key) {
        case "name":
          return `${s.lastName} ${s.firstName}`;
        case "id":
          return s.studentId;
        case "age":
          return s.dateOfBirth;
        case "class":
          return s.className && `${s.sessionName} ${s.className}`;
        case "guardian":
          return s.guardianName;
      }
    },
    { key: "name", direction: "asc" },
  );
  const th = (label: string, key: Key, ta?: "end") => (
    <SortableTh label={label} sortKey={key} sort={sort} onSort={toggle} ta={ta} />
  );
  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          {th("Student", "name")}
          {th("ID", "id")}
          {th("Age", "age", "end")}
          {th("Class", "class")}
          {th("Guardian", "guardian")}
          <Table.Th>Status</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {sorted.map((s) => (
          <Table.Tr key={s.id}>
            <Table.Td>
              <AppLink href={`/admin/students/${s.id}`} fw={500}>
                {s.firstName} {s.lastName}
              </AppLink>
            </Table.Td>
            <Table.Td>
              <Text component="span" c="dimmed">
                {s.studentId ?? "—"}
              </Text>
            </Table.Td>
            <Table.Td ta="end">{ageOn(s.dateOfBirth, today)}</Table.Td>
            <Table.Td>
              {s.className ? (
                <>
                  {s.className}
                  <Text component="span" c="dimmed">
                    {" "}
                    · {s.sessionName}
                  </Text>
                </>
              ) : (
                <Text component="span" c="dimmed">
                  —
                </Text>
              )}
            </Table.Td>
            <Table.Td>{s.guardianName ?? "—"}</Table.Td>
            <Table.Td>
              <StatusBadge domain="application" value={s.status} />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
