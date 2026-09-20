"use client";

import { Group, Select, Table, Text, TextInput } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { useState } from "react";
import { AppLink } from "@/components/AppLink";
import { Nothing } from "@/components/Nothing";
import { ClassFilter, type ClassFilterOption } from "@/components/ClassFilter";
import { LinkRow } from "@/components/LinkRow";
import { SortableTh, useSort } from "@/components/SortableTh";
import { useUrlFilters } from "@/components/useUrlFilters";
import tabular from "@/components/tabular.module.css";
import type { TermRegisterRow } from "@/lib/db/queries/attendance";
import { isTaken, PresentCell, RegisterCell } from "./RegisterCells";

export type RegisterFilter = "date" | "session" | "class" | "teacher" | "register";

type Props = {
  rows: TermRegisterRow[];
  // Where a row's register lives: /admin/attendance or /teacher/attendance.
  hrefBase: string;
  sessions?: { id: number; name: string }[];
  classes?: ClassFilterOption[];
  teachers?: { id: number; name: string }[];
  // Which filters to show: the attendance pages have them (the teacher's without the
  // teacher filter); a class's Attendance tab only the register status.
  filters?: RegisterFilter[];
  // Whether to show the class column (not on a class's own tab).
  showClass?: boolean;
  // Whether to show the teacher column (the office's view; a teacher knows who they are).
  showTeacher?: boolean;
};

const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "2026-09-12 (Sat)": sorts as it reads, and the date filter matches it as text, so
// "2026-09" is a month and "Sat" a weekday. The page's `TodayButton` sets the same filter.
export function sortableDate(date: string) {
  return `${date} (${weekday[new Date(`${date}T12:00:00Z`).getUTCDay()]})`;
}

// One row per lesson × class this term, newest first; the whole row opens the register.
export function RegistersTable({
  rows,
  hrefBase,
  sessions = [],
  classes = [],
  teachers = [],
  filters = ["date", "session", "class", "teacher", "register"],
  showClass = true,
  showTeacher = true,
}: Props) {
  const { params, set } = useUrlFilters();
  const date = params.get("date")?.trim().toLowerCase() ?? "";
  const session = params.get("session");
  const cls = params.get("class");
  const teacher = params.get("teacher");
  const register = params.get("register");
  // What's typed goes to the URL after a pause; when the URL changes from outside (the
  // page's Today button), the input follows it.
  const urlDate = params.get("date") ?? "";
  const [dateText, setDateText] = useState(urlDate);
  const [seenUrlDate, setSeenUrlDate] = useState(urlDate);
  if (urlDate !== seenUrlDate) {
    setSeenUrlDate(urlDate);
    setDateText(urlDate);
  }
  const typeDate = useDebouncedCallback((value: string) => set({ date: value }), 300);
  const shown = rows.filter(
    (r) =>
      (!date || sortableDate(r.date).toLowerCase().includes(date)) &&
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
        {filters.includes("date") && (
          <TextInput
            aria-label="Date"
            placeholder="Date, e.g. 2026-09"
            value={dateText}
            onChange={(e) => {
              setDateText(e.currentTarget.value);
              typeDate(e.currentTarget.value);
            }}
            w={170}
          />
        )}
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
            {showClass && showTeacher && <Table.Th>Teacher</Table.Th>}
            <Table.Th ta="end">Present</Table.Th>
            <Table.Th>Register</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sorted.map((r) => {
            const href = `${hrefBase}/${r.classId}?date=${r.date}`;
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
                {showClass && showTeacher && (
                  <Table.Td>{r.teacherName ?? <Nothing>no teacher</Nothing>}</Table.Td>
                )}
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
