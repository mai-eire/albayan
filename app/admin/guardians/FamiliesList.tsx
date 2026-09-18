"use client";

import { Checkbox, Group, Select, Stack, Table, Text, TextInput } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconSearch, IconUsersGroup } from "@tabler/icons-react";
import { AppLink } from "@/components/AppLink";
import { Nothing } from "@/components/Nothing";
import { ClassFilter } from "@/components/ClassFilter";
import { EmptyState } from "@/components/EmptyState";
import { SortableTh, useSort } from "@/components/SortableTh";
import { StatusBadge } from "@/components/StatusBadge";
import { useUrlFilters } from "@/components/useUrlFilters";
import type { GuardianListRow } from "@/lib/db/queries/students";
import { relationshipLabels } from "@/lib/demographics";
import {
  applyFamilyFilters,
  familiesFrom,
  parseFamilyFilters,
  type ClassOption,
  type FamilyRow,
} from "./filters";

type Key = "family" | "children";

type Props = {
  guardians: GuardianListRow[];
  sessions: { id: number; name: string }[];
  classes: ClassOption[];
  teachers: { id: number; name: string }[];
};

// One row per family: its guardians, how to reach them, and the children with their
// classes. Filters narrow by where the children are; everything happens in the browser.
export function FamiliesList({ guardians, sessions, classes, teachers }: Props) {
  const { params, set, query } = useUrlFilters();
  const filters = parseFamilyFilters(query);
  const shown = applyFamilyFilters(familiesFrom(guardians), filters, classes);
  const search = useDebouncedCallback((q: string) => set({ q }), 300);
  const session = params.get("session");
  const { sort, toggle, sorted } = useSort<Key, FamilyRow>(
    shown,
    (f, key) => (key === "family" ? f.name : f.children.length),
    { key: "family", direction: "asc" },
  );
  return (
    <>
      <Group gap="sm" wrap="wrap">
        <TextInput
          aria-label="Search"
          placeholder="Parent, child, email or phone"
          leftSection={<IconSearch size={16} stroke={1.75} />}
          defaultValue={params.get("q") ?? ""}
          onChange={(e) => search(e.currentTarget.value)}
          w={{ base: "100%", xs: 260 }}
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
        <Select
          aria-label="Teacher"
          placeholder="Any teacher"
          data={teachers.map((t) => ({ value: String(t.id), label: t.name }))}
          value={params.get("teacher")}
          clearable
          searchable
          onChange={(v) => set({ teacher: v })}
          w={180}
        />
        <Checkbox
          label="With an application waiting"
          checked={filters.applied ?? false}
          onChange={(e) => set({ applied: e.currentTarget.checked ? "1" : null })}
        />
        <Text size="sm" c="dimmed" ms="auto">
          {shown.length} {shown.length === 1 ? "family" : "families"}
        </Text>
      </Group>
      {shown.length === 0 ? (
        <EmptyState
          icon={<IconUsersGroup size={20} stroke={1.75} />}
          message="No families match. Try clearing a filter."
        />
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <SortableTh label="Family" sortKey="family" sort={sort} onSort={toggle} />
              <Table.Th>Guardians</Table.Th>
              <Table.Th>Contact</Table.Th>
              <SortableTh label="Children" sortKey="children" sort={sort} onSort={toggle} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sorted.map((f) => (
              <Table.Tr key={f.key}>
                <Table.Td fw={500}>{f.name}</Table.Td>
                <Table.Td>
                  <Stack gap={2}>
                    {f.guardians.map((g) => (
                      <Text key={g.id} size="sm">
                        <AppLink href={`/admin/guardians/${g.id}`} fw={500}>
                          {g.name}
                        </AppLink>
                        {g.relationship && (
                          <Text component="span" c="dimmed">
                            {" "}
                            ·{" "}
                            {relationshipLabels[g.relationship as keyof typeof relationshipLabels]}
                          </Text>
                        )}
                      </Text>
                    ))}
                  </Stack>
                </Table.Td>
                <Table.Td>
                  <Stack gap={2}>
                    {f.guardians.map((g) => (
                      <Text key={g.id} size="sm" c="dimmed">
                        {g.email}
                        {g.phone && ` · ${g.phone}`}
                      </Text>
                    ))}
                  </Stack>
                </Table.Td>
                <Table.Td>
                  {f.children.length === 0 ? (
                    <Nothing>no children</Nothing>
                  ) : (
                    <Stack gap={2}>
                      {f.children.map((c) => (
                        <Group key={c.id} gap="xs" wrap="nowrap">
                          <Text size="sm">
                            <AppLink href={`/admin/students/${c.id}`}>{c.firstName}</AppLink>
                            {c.className && (
                              <Text component="span" c="dimmed">
                                {" "}
                                · {c.className} · {c.sessionName}
                              </Text>
                            )}
                          </Text>
                          {c.status !== "active" && (
                            <StatusBadge domain="application" value={c.status} size="xs" />
                          )}
                        </Group>
                      ))}
                    </Stack>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </>
  );
}
