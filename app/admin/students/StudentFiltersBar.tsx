"use client";

import { Group, Select, TextInput } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const statuses = [
  { value: "active", label: "Attending" },
  { value: "applied", label: "Applied" },
  { value: "inactive", label: "Left" },
  { value: "declined", label: "Declined" },
];

// Filters live in the URL so a filtered list can be shared and survives a refresh.
export function StudentFiltersBar({
  sessions,
  classes,
}: {
  sessions: { id: number; name: string }[];
  classes: { id: number; name: string; sessionId: number }[];
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
  const session = params.get("session");
  const visibleClasses = session ? classes.filter((c) => String(c.sessionId) === session) : classes;

  return (
    <Group gap="sm" wrap="wrap">
      <TextInput
        aria-label="Search"
        placeholder="Name or student ID"
        leftSection={<IconSearch size={16} stroke={1.75} />}
        defaultValue={params.get("q") ?? ""}
        onChange={(e) => search(e.currentTarget.value)}
        w={{ base: "100%", xs: 240 }}
      />
      <Select
        aria-label="Status"
        data={statuses}
        value={params.get("status") ?? "active"}
        allowDeselect={false}
        onChange={(v) => set({ status: v })}
        w={140}
      />
      <Select
        aria-label="Day"
        placeholder="Any day"
        data={sessions.map((s) => ({ value: String(s.id), label: s.name }))}
        value={session}
        clearable
        onChange={(v) => set({ session: v, class: null })}
        w={150}
      />
      <Select
        aria-label="Class"
        placeholder="Any class"
        data={visibleClasses.map((c) => ({ value: String(c.id), label: c.name }))}
        value={params.get("class")}
        clearable
        onChange={(v) => set({ class: v })}
        w={150}
      />
    </Group>
  );
}
