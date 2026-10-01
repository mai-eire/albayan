"use client";

import { Select, Table, Text, TextInput } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconSearch, IconUsers } from "@tabler/icons-react";
import { AppLink } from "@/components/AppLink";
import { Nothing } from "@/components/Nothing";
import { ClassFilter, type ClassFilterOption } from "@/components/ClassFilter";
import { EmptyState } from "@/components/EmptyState";
import { SortableTh, useSort } from "@/components/SortableTh";
import { StatusBadge } from "@/components/StatusBadge";
import { useUrlFilters } from "@/components/useUrlFilters";
import { ageOn } from "@/lib/age";
import type { StudentListRow } from "@/lib/db/queries/students";
import { applyStudentFilters, parseStudentFilters, studentStatusOptions } from "./filters";
import { FilterBar } from "@/components/FilterBar";

type Key = "name" | "id" | "age" | "class" | "guardians";

type Props = {
  rows: StudentListRow[];
  sessions: { id: number; name: string }[];
  classes: ClassFilterOption[];
  today: string;
};

// Filters above, one line per student below (§4.5); everything happens in the browser.
export function StudentsList({ rows, sessions, classes, today }: Props) {
  const { params, set, query } = useUrlFilters();
  const filters = parseStudentFilters(query);
  const shown = applyStudentFilters(rows, filters);
  const search = useDebouncedCallback((q: string) => set({ q }), 300);
  const session = params.get("session");
  const { sort, toggle, sorted } = useSort<Key, StudentListRow>(
    shown,
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
        case "guardians":
          return s.guardians[0]?.name ?? null;
      }
    },
    { key: "name", direction: "asc" },
  );
  const th = (label: string, key: Key, ta?: "end") => (
    <SortableTh label={label} sortKey={key} sort={sort} onSort={toggle} ta={ta} />
  );
  return (
    <>
      <FilterBar>
        <TextInput
          aria-label="Search"
          placeholder="Student, ID or guardian"
          leftSection={<IconSearch size={16} stroke={1.75} />}
          defaultValue={params.get("q") ?? ""}
          onChange={(e) => search(e.currentTarget.value)}
          w={{ base: "100%", xs: 240 }}
        />
        <Select
          aria-label="Status"
          data={studentStatusOptions}
          value={filters.status}
          allowDeselect={false}
          onChange={(v) => set({ status: v })}
          w={140}
        />
        <Select
          aria-label="Session"
          placeholder="Any session"
          data={sessions.map((s) => ({ value: String(s.id), label: s.name }))}
          value={session}
          clearable
          onChange={(v) => set({ session: v, class: null })}
          w={150}
        />
        <ClassFilter
          classes={classes}
          sessionId={session}
          value={params.get("class")}
          onChange={(v) => set({ class: v })}
        />
        <Text size="sm" c="dimmed" ms="auto">
          {shown.length} shown
        </Text>
      </FilterBar>
      {shown.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={20} stroke={1.75} />}
          message="No students match. Try clearing a filter."
        />
      ) : (
        <Table.ScrollContainer minWidth={0} type="native">
          <Table>
            <Table.Thead>
              <Table.Tr>
                {th("Student", "name")}
                {th("ID", "id")}
                {th("Age", "age", "end")}
                {th("Class", "class")}
                {th("Guardians", "guardians")}
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
                    {s.studentId ? (
                      <Text component="span" c="dimmed">
                        {s.studentId}
                      </Text>
                    ) : (
                      <Nothing>no ID yet</Nothing>
                    )}
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
                      <Nothing>not placed</Nothing>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {s.guardians.length === 0 ? (
                      <Nothing>no guardians</Nothing>
                    ) : (
                      s.guardians.map((g, i) => (
                        <span key={g.id}>
                          {i > 0 && (
                            <Text component="span" c="dimmed">
                              {", "}
                            </Text>
                          )}
                          <AppLink href={`/admin/guardians/${g.id}`}>{g.name}</AppLink>
                        </span>
                      ))
                    )}
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge domain="application" value={s.status} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </>
  );
}
