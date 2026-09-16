"use client";

import { Tabs } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { value: "years", label: "Years & terms" },
  { value: "subjects", label: "Subjects" },
  { value: "sessions", label: "Sessions" },
  { value: "classes", label: "Classes" },
];

export function AcademicsTabs() {
  const current = usePathname().split("/")[3] ?? "years";
  return (
    <Tabs value={current}>
      <Tabs.List>
        {tabs.map((tab) => (
          <Tabs.Tab
            key={tab.value}
            value={tab.value}
            component={Link}
            {...{ href: `/admin/academics/${tab.value}` }}
          >
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
