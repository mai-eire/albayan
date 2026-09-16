"use client";

import { Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { DirectionalIcon } from "./DirectionalIcon";
import classes from "./EntityList.module.css";

export type EntityListItem = {
  key: string | number;
  title: string;
  // One line under the title: "Saturday · 10:00", "Due tomorrow".
  detail?: string;
  // A SubjectBadge or StatusBadge on the end side.
  badge?: ReactNode;
  href?: string;
};

// Family and student lists (§4.6): rounded rows on the ground colour, tappable.
export function EntityList({ items }: { items: EntityListItem[] }) {
  return (
    <Stack gap="xs">
      {items.map((item) => {
        const body = (
          <Group justify="space-between" wrap="nowrap" gap="sm">
            <div className={classes.text}>
              <Text fw={500} truncate>
                {item.title}
              </Text>
              {item.detail && (
                <Text size="sm" c="dimmed" truncate>
                  {item.detail}
                </Text>
              )}
            </div>
            <Group gap="xs" wrap="nowrap">
              {item.badge}
              {item.href && (
                <DirectionalIcon
                  icon={IconChevronRight}
                  size={18}
                  color="var(--mantine-color-dimmed)"
                />
              )}
            </Group>
          </Group>
        );
        return item.href ? (
          <UnstyledButton key={item.key} component={Link} href={item.href} className={classes.row}>
            {body}
          </UnstyledButton>
        ) : (
          <div key={item.key} className={classes.row}>
            {body}
          </div>
        );
      })}
    </Stack>
  );
}
