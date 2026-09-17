"use client";

import { Group, Select, TextInput } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Filters live in the URL, like the students list.
export function ClassFilters({
  sessions,
  teachers,
}: {
  sessions: { id: number; name: string }[];
  teachers: { id: number; name: string }[];
}) {
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
  const search = useDebouncedCallback((q: string) => set({ q }), 300);
  return (
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
        value={params.get("session")}
        clearable
        onChange={(v) => set({ session: v })}
        w={160}
      />
      <Select
        aria-label="Teacher"
        placeholder="Any teacher"
        data={teachers.map((t) => ({ value: String(t.id), label: t.name }))}
        value={params.get("teacher")}
        clearable
        searchable
        onChange={(v) => set({ teacher: v })}
        w={200}
      />
    </Group>
  );
}
