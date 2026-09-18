"use client";

import { Group, Select, Table, Text } from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { Nothing } from "@/components/Nothing";
import { ClassFilter, type ClassFilterOption } from "@/components/ClassFilter";
import { LinkRow } from "@/components/LinkRow";
import { SortableTh, useSort } from "@/components/SortableTh";
import { useUrlFilters } from "@/components/useUrlFilters";
import tabular from "@/components/tabular.module.css";
import type { TermRegisterRow } from "@/lib/db/queries/attendance";
import { isTaken, PresentCell, RegisterCell } from "./RegisterCells";

type Props = {
  rows: TermRegisterRow[];
  sessions?: { id: number; name: string }[];
  classes?: ClassFilterOption[];
  teachers?: { id: number; name: string }[];
  // Which filters to show: the attendance page has them all; a class's Attendance tab
  // only the register status.
  filters?: ("session" | "class" | "teacher" | "register")[];
  // Whether to show the class and teacher columns (not on a class's own tab).
  showClass?: boolean;
};

const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "2026-09-12 (Sat)": sorts as it reads.
function sortableDate(date: string) {
  return `${date} (${weekday[new Date(`${date}T12:00:00Z`).getUTCDay()]})`;
}

// One row per lesson × class this term, newest first; the whole row opens the register.
export function TermTable({
  rows,
  sessions = [],
  classes = [],
  teachers = [],
  filters = ["session", "class", "teacher", "register"],
  showClass = true,
}: Props) {
  const { params, set } = useUrlFilters();
  const session = params.get("session");
  const cls = params.get("class");
  const teacher = params.get("teacher");
  const register = params.get("register");
  const shown = rows.filter(
    (r) =>
      (!session || String(r.sessionId) === session) &&
      (!cls || String(r.classId) === cls) &&
      (!teacher || r.teacherIds.includes(Number(teacher))) &&
      (!register || r.studentCount === 0 || (register === "taken") === isTaken(r)),
  );
  const { sort, toggle, sorted } = useSort<"date", TermRegisterRow>(
    shown,
    (r) => `${r.date} ${r.startTime} ${r.className}`,
    { key: "date", direction: "desc" },
  );
  return (
    <>
      <Group gap="sm" wrap="wrap">
        {filters.includes("session") && (
          <Select
            aria-label="Session"
            placeholder="Any session"
            data={sessions.map((s) => ({ value: String(s.id), label: s.name }))}
            value={session}
            clearable
            onChange={(v) => set({ session: v, class: null })}
            w={160}
          />
        )}
        {filters.includes("class") && (
          <ClassFilter
            classes={classes}
            sessionId={session}
            value={cls}
            onChange={(v) => set({ class: v })}
          />
        )}
        {filters.includes("teacher") && (
          <Select
            aria-label="Teacher"
            placeholder="Any teacher"
            data={teachers.map((t) => ({ value: String(t.id), label: t.name }))}
            value={teacher}
            clearable
            searchable
            onChange={(v) => set({ teacher: v })}
            w={190}
          />
        )}
        {filters.includes("register") && (
          <Select
            aria-label="Register status"
            placeholder="Register status"
            data={[
              { value: "missing", label: "Not taken" },
              { value: "taken", label: "Taken" },
            ]}
            value={register}
            clearable
            onChange={(v) => set({ register: v })}
            w={160}
          />
        )}
        <Text size="sm" c="dimmed" ms="auto">
          {shown.length} {shown.length === 1 ? "register" : "registers"}
        </Text>
      </Group>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <SortableTh label="Date" sortKey="date" sort={sort} onSort={toggle} />
            <Table.Th>Session</Table.Th>
            {showClass && <Table.Th>Class</Table.Th>}
            {showClass && <Table.Th>Teacher</Table.Th>}
            <Table.Th ta="end">Present</Table.Th>
            <Table.Th>Register</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sorted.map((r) => {
            const href = `/admin/attendance/${r.classId}?date=${r.date}`;
            return (
              <LinkRow key={`${r.date}-${r.classId}`} href={href}>
                <Table.Td className={tabular.tabular}>
                  <AppLink href={href} fw={500}>
                    {sortableDate(r.date)}
                  </AppLink>
                </Table.Td>
                <Table.Td>
                  {r.sessionName} ({r.startTime}–{r.endTime})
                </Table.Td>
                {showClass && <Table.Td>{r.className}</Table.Td>}
                {showClass && <Table.Td>{r.teacherName ?? <Nothing>no teacher</Nothing>}</Table.Td>}
                <PresentCell r={r} />
                <RegisterCell r={r} />
              </LinkRow>
            );
          })}
        </Table.Tbody>
      </Table>
    </>
  );
}
