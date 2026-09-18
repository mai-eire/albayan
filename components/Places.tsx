"use client";

import { Group, Text, Tooltip } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import tabular from "./tabular.module.css";

// "6 / 15" places taken. Full reads in saffron; over capacity in clay with a warning icon
// before the number and a tooltip saying so (DESIGN §4.5).
export function Places({ count, capacity }: { count: number; capacity: number | null }) {
  if (capacity === null) return <span className={tabular.tabular}>{count}</span>;
  const over = count > capacity;
  const full = count === capacity;
  const figure = (
    <Text
      component="span"
      className={tabular.tabular}
      c={over ? "clay" : full ? "saffron" : undefined}
      fw={over || full ? 500 : undefined}
    >
      {count}
      <Text component="span" c={over ? "clay" : "dimmed"}>
        {` / ${capacity}`}
      </Text>
    </Text>
  );
  if (!over) return figure;
  return (
    <Tooltip label={`Over capacity: ${count} students for ${capacity} places`}>
      <Group gap={4} wrap="nowrap" justify="flex-end" component="span">
        <IconAlertTriangle size={16} stroke={1.75} color="var(--mantine-color-clay-6)" />
        {figure}
      </Group>
    </Tooltip>
  );
}
