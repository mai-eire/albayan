"use client";

import { Tabs, Text, Tooltip } from "@mantine/core";
import { IconCircleCheck, IconCircleHalf2, IconCircleX } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// A tab whose href is `base` itself rather than a segment under it.
export const baseTab = "_base";

// A small state mark on a tab (§4.12): the fee status on a Fees tab, so what's inside is
// visible before opening it. Shape and colour together, never colour alone.
export type TabMark = "good" | "partial" | "bad";

const marks: Record<TabMark, { icon: typeof IconCircleCheck; color: string }> = {
  good: { icon: IconCircleCheck, color: "var(--mantine-color-tile-6)" },
  partial: { icon: IconCircleHalf2, color: "var(--mantine-color-saffron-6)" },
  bad: { icon: IconCircleX, color: "var(--mantine-color-clay-6)" },
};

type Tab = {
  value: string;
  label: string;
  mark?: { kind: TabMark; label: string } | null;
  // How many things are inside ("Students 12", "Students 6 / 15"), dimmed after the label.
  count?: number | string;
};

// Tabs that are routes: each tab is a link under `base`, the active one read from the URL.
// Server components render each tab's page.
export function LinkTabs({ base, tabs }: { base: string; tabs: Tab[] }) {
  const rest = usePathname().slice(base.length).split("/")[1] ?? "";
  const current = tabs.find((t) => t.value === rest)?.value ?? baseTab;
  return (
    <Tabs value={current}>
      <Tabs.List>
        {tabs.map((tab) => {
          const mark = tab.mark ? marks[tab.mark.kind] : null;
          return (
            <Tabs.Tab
              key={tab.value}
              value={tab.value}
              component={Link}
              {...{ href: tab.value === baseTab ? base : `${base}/${tab.value}` }}
              rightSection={
                mark &&
                tab.mark && (
                  <Tooltip label={tab.mark.label}>
                    <mark.icon
                      size={14}
                      stroke={2}
                      color={mark.color}
                      aria-label={tab.mark.label}
                    />
                  </Tooltip>
                )
              }
            >
              {tab.label}
              {tab.count !== undefined && (
                <Text component="span" c="dimmed" size="sm" ms={6}>
                  {tab.count}
                </Text>
              )}
            </Tabs.Tab>
          );
        })}
      </Tabs.List>
    </Tabs>
  );
}
