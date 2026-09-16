"use client";

import { Tabs } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";

// A tab whose href is `base` itself rather than a segment under it.
export const baseTab = "_base";

type Tab = { value: string; label: string };

// Tabs that are routes: each tab is a link under `base`, the active one read from the URL.
// Server components render each tab's page.
export function LinkTabs({ base, tabs }: { base: string; tabs: Tab[] }) {
  const rest = usePathname().slice(base.length).split("/")[1] ?? "";
  const current = tabs.find((t) => t.value === rest)?.value ?? baseTab;
  return (
    <Tabs value={current}>
      <Tabs.List>
        {tabs.map((tab) => (
          <Tabs.Tab
            key={tab.value}
            value={tab.value}
            component={Link}
            {...{ href: tab.value === baseTab ? base : `${base}/${tab.value}` }}
          >
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
