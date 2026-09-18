"use client";

import { Card, Group, Text } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import { DirectionalIcon } from "./DirectionalIcon";
import classes from "./StatTile.module.css";

type Props = {
  label: string;
  value: string | number;
  // What the value is out of ("/ €10,000"), smaller and dimmed after it.
  outOf?: string;
  hint?: string;
  // Only when the number itself is a status ("3 registers missing" → "saffron").
  color?: "saffron" | "clay";
  // The page that answers the tile's question; the whole tile is the link.
  href?: string;
};

// Admin dashboard only, at most three (§3.3, §4.4). A client component because a Server
// Component can't hand `component={Link}` to Mantine.
export function StatTile({ label, value, outOf, hint, color, href }: Props) {
  const body = (
    <>
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" c="dimmed" fw={500}>
          {label}
        </Text>
        {href && (
          <DirectionalIcon icon={IconChevronRight} size={16} color="var(--mantine-color-dimmed)" />
        )}
      </Group>
      <Text className={classes.value} c={color}>
        {value}
        {outOf && (
          <Text component="span" className={classes.outOf} c="dimmed">
            {" "}
            / {outOf}
          </Text>
        )}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </>
  );
  return href ? (
    <Card component={Link} href={href} className={classes.link} aria-label={`${label}: ${value}`}>
      {body}
    </Card>
  ) : (
    <Card>{body}</Card>
  );
}
