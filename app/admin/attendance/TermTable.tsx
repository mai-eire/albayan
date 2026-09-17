"use client";

import { Group, Select, Table, Text } from "@mantine/core";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppLink } from "@/components/AppLink";
import { StatusBadge } from "@/components/StatusBadge";
import tabular from "@/components/tabular.module.css";
import type { TermRegisterRow } from "@/lib/db/queries/attendance";
import { formatDate } from "@/lib/time";

type Props = {
  rows: TermRegisterRow[];
  sessions: { id: number; name: string }[];
  classes: { id: number; name: string; sessionId: number }[];
  timezone: string;
};

// One row per lesson × class this term, newest first; filters live in the URL.
export function TermTable({ rows, sessions, classes, timezone }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`${pathname}?${next}`);
  };
  const session = params.get("session");
  const cls = params.get("class");
  const shown = rows.filter(
    (r) => (!session || String(r.sessionId) === session) && (!cls || String(r.classId) === cls),
  );
  const visibleClasses = session ? classes.filter((c) => String(c.sessionId) === session) : classes;
  return (
    <>
      <Group gap="sm" wrap="wrap">
        <Select
          aria-label="Session"
          placeholder="Any session"
          data={sessions.map((s) => ({ value: String(s.id), label: s.name }))}
          value={session}
          clearable
          onChange={(v) => set({ session: v, class: null })}
          w={160}
        />
        <Select
          aria-label="Class"
          placeholder="Any class"
          data={visibleClasses.map((c) => ({ value: String(c.id), label: c.name }))}
          value={cls}
          clearable
          onChange={(v) => set({ class: v })}
          w={160}
        />
      </Group>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            <Table.Th>Session</Table.Th>
            <Table.Th>Class</Table.Th>
            <Table.Th>Teacher</Table.Th>
            <Table.Th ta="end">Present</Table.Th>
            <Table.Th>Register</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {shown.map((r) => (
            <Table.Tr key={`${r.date}-${r.classId}`}>
              <Table.Td>
                <AppLink href={`/admin/attendance/${r.classId}?date=${r.date}`} fw={500}>
                  {formatDate(r.date, timezone)}
                </AppLink>
              </Table.Td>
              <Table.Td>{r.sessionName}</Table.Td>
              <Table.Td>{r.className}</Table.Td>
              <Table.Td>{r.teacherName ?? "—"}</Table.Td>
              <Table.Td ta="end" className={tabular.tabular}>
                {r.recordedCount ? (
                  <>
                    <Text component="span" c={r.absentCount ? "clay" : undefined} fw={500}>
                      {r.recordedCount - r.absentCount}
                    </Text>
                    <Text component="span" c="dimmed">
                      {" "}
                      / {r.studentCount}
                    </Text>
                  </>
                ) : (
                  <Text component="span" c="dimmed">
                    {r.studentCount} students
                  </Text>
                )}
              </Table.Td>
              <Table.Td>
                {r.studentCount === 0 ? (
                  <Text size="sm" c="dimmed">
                    Empty class
                  </Text>
                ) : r.recordedCount >= r.studentCount ? (
                  <StatusBadge domain="register" value="taken" />
                ) : (
                  <StatusBadge domain="register" value="missing" />
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </>
  );
}
