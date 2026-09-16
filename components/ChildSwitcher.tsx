"use client";

import { Avatar, Button, Group } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type SwitcherChild = { id: number; firstName: string };

// Siblings get a fixed pastel each so they are told apart at a glance (§4.11).
const pastels = ["tile", "lapis", "plum", "saffron", "cyan", "grape"];

// Pills under the header on every family page; hidden when there is one child (§5).
// Keeps the current tab when switching: /family/12/timetable → /family/15/timetable.
export function ChildSwitcher({ kids }: { kids: SwitcherChild[] }) {
  const pathname = usePathname();
  if (kids.length < 2) return null;
  const match = pathname.match(/^\/family\/(\d+)(\/.*)?$/);
  const currentId = match ? Number(match[1]) : null;
  const tab = match?.[2] ?? "";
  return (
    <Group gap="xs">
      {kids.map((kid, i) => {
        const active = kid.id === currentId;
        const color = pastels[i % pastels.length];
        return (
          <Button
            key={kid.id}
            component={Link}
            href={`/family/${kid.id}${tab}`}
            variant={active ? "filled" : "light"}
            color={color}
            radius="xl"
            size="md"
            leftSection={
              <Avatar size="sm" radius="xl" color={color} variant={active ? "white" : "light"}>
                {kid.firstName[0]}
              </Avatar>
            }
          >
            {kid.firstName}
          </Button>
        );
      })}
    </Group>
  );
}
