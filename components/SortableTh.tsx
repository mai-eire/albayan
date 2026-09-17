"use client";

import { Group, Table, UnstyledButton } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconArrowsSort } from "@tabler/icons-react";
import { useState } from "react";
import classes from "./SortableTh.module.css";

export type SortDirection = "asc" | "desc";
export type Sort<K extends string> = { key: K; direction: SortDirection };

// Client-side sorting for staff tables (§4.5): the rows are already loaded, so a click
// just reorders them. `rank` gives each row's value for a key; strings sort naturally.
export function useSort<K extends string, Row>(
  rows: Row[],
  rank: (row: Row, key: K) => string | number | null,
  initial: Sort<K>,
) {
  const [sort, setSort] = useState<Sort<K>>(initial);
  const toggle = (key: K) =>
    setSort((s) =>
      s.key === key
        ? { key, direction: s.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === initial.key ? initial.direction : "asc" },
    );
  const sorted = [...rows].sort((a, b) => {
    const x = rank(a, sort.key);
    const y = rank(b, sort.key);
    if (x === y) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    const cmp =
      typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return sort.direction === "asc" ? cmp : -cmp;
  });
  return { sort, toggle, sorted };
}

type Props<K extends string> = {
  label: string;
  sortKey: K;
  sort: Sort<K>;
  onSort: (key: K) => void;
  ta?: "start" | "end";
};

export function SortableTh<K extends string>({ label, sortKey, sort, onSort, ta }: Props<K>) {
  const active = sort.key === sortKey;
  const Icon = !active ? IconArrowsSort : sort.direction === "asc" ? IconArrowUp : IconArrowDown;
  return (
    <Table.Th
      ta={ta}
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <UnstyledButton
        onClick={() => onSort(sortKey)}
        className={classes.button}
        data-active={active || undefined}
      >
        <Group gap={4} wrap="nowrap" justify={ta === "end" ? "flex-end" : "flex-start"}>
          <span>{label}</span>
          <Icon size={14} stroke={1.75} className={classes.icon} />
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}
