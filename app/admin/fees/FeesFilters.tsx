"use client";

import { Group, Select } from "@mantine/core";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  years: { id: string; isCurrent: boolean }[];
  year: string;
  sessions: { id: number; name: string }[];
  classes: { id: number; name: string; sessionId: number }[];
};

export function FeesFilters({ years, year, sessions, classes }: Props) {
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
  const visibleClasses = session ? classes.filter((c) => String(c.sessionId) === session) : classes;

  return (
    <Group gap="sm" wrap="wrap">
      <Select
        aria-label="Show"
        data={[
          { value: "outstanding", label: "Still to pay" },
          { value: "everyone", label: "Everyone" },
        ]}
        value={params.get("show") === "everyone" ? "everyone" : "outstanding"}
        allowDeselect={false}
        onChange={(v) => set({ show: v })}
        w={150}
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
        w={160}
      />
      <Select
        aria-label="Academic year"
        data={years.map((y) => ({ value: y.id, label: y.isCurrent ? `${y.id} (current)` : y.id }))}
        value={year}
        allowDeselect={false}
        onChange={(v) => set({ year: v, session: null, class: null })}
        w={170}
      />
    </Group>
  );
}
