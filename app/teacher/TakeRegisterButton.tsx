"use client";

import { Button, Menu, MenuDropdown, MenuItem, MenuTarget } from "@mantine/core";
import { IconChevronDown, IconClipboardCheck } from "@tabler/icons-react";
import Link from "next/link";
import { LinkButton } from "@/components/LinkButton";

export type RegisterToTake = { classId: number; className: string; href: string };

// The page's one action on Today: the register for the class I lead, or a pick when I
// lead more than one class meeting today.
export function TakeRegisterButton({ registers }: { registers: RegisterToTake[] }) {
  const icon = <IconClipboardCheck size={16} stroke={1.75} />;
  if (registers.length === 1) {
    return (
      <LinkButton href={registers[0].href} leftSection={icon}>
        Take register
      </LinkButton>
    );
  }
  return (
    <Menu shadow="md" position="bottom-end">
      <MenuTarget>
        <Button leftSection={icon} rightSection={<IconChevronDown size={14} stroke={1.75} />}>
          Take register
        </Button>
      </MenuTarget>
      <MenuDropdown>
        {registers.map((r) => (
          <MenuItem key={r.classId} component={Link} href={r.href}>
            {r.className}
          </MenuItem>
        ))}
      </MenuDropdown>
    </Menu>
  );
}
