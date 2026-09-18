"use client";

import { Group, Select, TextInput } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { ClassFilter, type ClassFilterOption } from "@/components/ClassFilter";
import { useUrlFilters } from "@/components/useUrlFilters";
import { parseFeeFilters } from "./filters";

type Props = {
  years: { id: string; isCurrent: boolean }[];
  year: string;
  sessions: { id: number; name: string }[];
  classes: ClassFilterOption[];
};

// Show / session / class narrow the rows already loaded; the year loads a different set,
// so that one is a real navigation.
export function FeesFilters({ years, year, sessions, classes }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { params, set, query } = useUrlFilters();
  const session = params.get("session");
  const search = useDebouncedCallback((q: string) => set({ q }), 300);

  return (
    <Group gap="sm" wrap="wrap">
      <TextInput
        aria-label="Search"
        placeholder="Student, ID or guardian"
        leftSection={<IconSearch size={16} stroke={1.75} />}
        defaultValue={params.get("q") ?? ""}
        onChange={(e) => search(e.currentTarget.value)}
        w={{ base: "100%", xs: 220 }}
      />
      <Select
        aria-label="Show"
        data={[
          { value: "outstanding", label: "Still to pay" },
          { value: "paid", label: "Paid or part paid" },
          { value: "everyone", label: "Everyone" },
        ]}
        value={parseFeeFilters(query).show}
        allowDeselect={false}
        onChange={(v) => set({ show: v })}
        w={170}
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
        aria-label="Academic year"
        data={years.map((y) => ({ value: y.id, label: y.isCurrent ? `${y.id} (current)` : y.id }))}
        value={year}
        allowDeselect={false}
        onChange={(v) => v && router.push(`${pathname}?year=${v}`)}
        w={170}
      />
    </Group>
  );
}
