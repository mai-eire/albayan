"use client";

import { Group, Select, Table, TextInput } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconSearch, IconUsers } from "@tabler/icons-react";
import { AppLink } from "@/components/AppLink";
import { Nothing } from "@/components/Nothing";
import { EmptyState } from "@/components/EmptyState";
import { Places } from "@/components/Places";
import { useUrlFilters } from "@/components/useUrlFilters";
import type { ClassRow } from "@/lib/db/queries/academics";

type Props = {
  classes: ClassRow[];
  sessions: { id: number; name: string }[];
  teachers: { id: number; name: string }[];
  emptyMessage: string;
};

// The year's classes, narrowed in the browser by name, session or teacher.
export function ClassesList({ classes, sessions, teachers, emptyMessage }: Props) {
  const { params, set } = useUrlFilters();
  const q = params.get("q")?.trim().toLowerCase();
  const session = params.get("session");
  const teacher = params.get("teacher");
  const shown = classes.filter(
    (c) =>
      (!session || c.sessionId === Number(session)) &&
      (!teacher || c.teacherIds.includes(Number(teacher))) &&
      (!q || c.name.toLowerCase().includes(q)),
  );
  const search = useDebouncedCallback((value: string) => set({ q: value }), 300);
  return (
    <>
      {classes.length > 0 && (
        <Group gap="sm" wrap="wrap">
          <TextInput
            aria-label="Search"
            placeholder="Class name"
            leftSection={<IconSearch size={16} stroke={1.75} />}
            defaultValue={params.get("q") ?? ""}
            onChange={(e) => search(e.currentTarget.value)}
            w={{ base: "100%", xs: 200 }}
          />
          <Select
            aria-label="Session"
            placeholder="Any session"
            data={sessions.map((s) => ({ value: String(s.id), label: s.name }))}
            value={session}
            clearable
            onChange={(v) => set({ session: v })}
            w={160}
          />
          <Select
            aria-label="Teacher"
            placeholder="Any teacher"
            data={teachers.map((t) => ({ value: String(t.id), label: t.name }))}
            value={teacher}
            clearable
            searchable
            onChange={(v) => set({ teacher: v })}
            w={200}
          />
        </Group>
      )}
      {shown.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={20} stroke={1.75} />}
          message={classes.length ? "No classes match these filters." : emptyMessage}
        />
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Class</Table.Th>
              <Table.Th>Session</Table.Th>
              <Table.Th>Class teacher</Table.Th>
              <Table.Th>Room</Table.Th>
              <Table.Th ta="end">Students</Table.Th>
              <Table.Th ta="end">Applications</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {shown.map((c) => (
              <Table.Tr key={c.id}>
                <Table.Td>
                  <AppLink href={`/admin/academics/classes/${c.id}`} fw={600}>
                    {c.name}
                  </AppLink>
                </Table.Td>
                <Table.Td>{c.sessionName}</Table.Td>
                <Table.Td>{c.classTeacherName ?? <Nothing>no teacher</Nothing>}</Table.Td>
                <Table.Td>{c.room ?? <Nothing>no room</Nothing>}</Table.Td>
                <Table.Td ta="end">
                  <Places count={c.studentCount} capacity={c.capacity} />
                </Table.Td>
                <Table.Td ta="end">{c.applicationCount}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </>
  );
}
