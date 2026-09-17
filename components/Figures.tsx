import { SimpleGrid, Text } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./Figures.module.css";

export type Figure = {
  label: string;
  value: ReactNode;
  hint?: string;
  // Only when the number itself is a status: an outstanding balance in saffron, credit in tile.
  color?: "saffron" | "clay" | "tile";
};

// A row of headline numbers inside a card or under a page header (§4.4): label, big
// figure, optional hint. For the numbers a page is about — fee, paid, balance.
export function Figures({ items }: { items: Figure[] }) {
  return (
    <SimpleGrid cols={{ base: 2, xs: Math.min(items.length, 4) }} spacing="lg">
      {items.map((f) => (
        <div key={f.label}>
          <Text size="sm" c="dimmed" fw={500}>
            {f.label}
          </Text>
          <Text className={classes.value} c={f.color}>
            {f.value}
          </Text>
          {f.hint && (
            <Text size="xs" c="dimmed">
              {f.hint}
            </Text>
          )}
        </div>
      ))}
    </SimpleGrid>
  );
}
