"use client";

import { Select } from "@mantine/core";

export type ClassFilterOption = {
  id: number;
  name: string;
  sessionId: number;
  sessionName: string;
};

type Props = {
  classes: ClassFilterOption[];
  // The session filter beside it, if one is chosen: only that session's classes are offered.
  sessionId: string | null;
  value: string | null;
  onChange: (value: string | null) => void;
  w?: number;
};

// The "Any class" filter used above every admin list. Options carry their session
// ("Level 1 · Saturday") because each session has its own Level 1.
export function ClassFilter({ classes, sessionId, value, onChange, w = 190 }: Props) {
  const visible = sessionId ? classes.filter((c) => String(c.sessionId) === sessionId) : classes;
  return (
    <Select
      aria-label="Class"
      placeholder="Any class"
      data={visible.map((c) => ({
        value: String(c.id),
        label: sessionId ? c.name : `${c.name} · ${c.sessionName}`,
      }))}
      value={value}
      clearable
      onChange={onChange}
      w={w}
    />
  );
}
