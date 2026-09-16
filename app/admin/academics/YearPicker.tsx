"use client";

import { Select } from "@mantine/core";
import { usePathname, useRouter } from "next/navigation";

// Sessions and classes belong to a year; this switches which year the tab shows.
export function YearPicker({
  years,
  value,
}: {
  years: { id: string; isCurrent: boolean }[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Select
      aria-label="Academic year"
      data={years.map((y) => ({ value: y.id, label: y.isCurrent ? `${y.id} (current)` : y.id }))}
      value={value}
      allowDeselect={false}
      onChange={(id) => id && router.push(`${pathname}?year=${id}`)}
      maw={200}
    />
  );
}
