import { SimpleGrid, Text, UnstyledButton } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./Figures.module.css";

export type Figure = {
  label: string;
  value: ReactNode;
  // A share or an "out of" after the value ("(63%)", "/ €10,000"), smaller and dimmed.
  aside?: string;
  hint?: string;
  // Only when the number itself is a status: an outstanding balance in saffron, credit in tile.
  color?: "saffron" | "clay" | "tile";
  // A figure that narrows the list below it to the rows it counts (fees: "Paid" shows
  // who has paid). Pressed figures are underlined on hover; `active` marks the current one.
  onClick?: () => void;
  active?: boolean;
};

// A row of headline numbers inside a card or under a page header (§4.4): label, big
// figure, optional hint. For the numbers a page is about — fee, paid, balance.
export function Figures({ items }: { items: Figure[] }) {
  return (
    <SimpleGrid cols={{ base: 2, xs: Math.min(items.length, 4) }} spacing="lg">
      {items.map((f) => {
        const body = (
          <>
            <Text size="sm" c="dimmed" fw={500}>
              {f.label}
            </Text>
            <Text className={classes.value} c={f.color}>
              <span className={classes.figure}>{f.value}</span>
              {f.aside && (
                <Text component="span" className={classes.aside} c="dimmed">
                  {" "}
                  {f.aside}
                </Text>
              )}
            </Text>
            {f.hint && (
              <Text size="xs" c="dimmed">
                {f.hint}
              </Text>
            )}
          </>
        );
        return f.onClick ? (
          <UnstyledButton
            key={f.label}
            onClick={f.onClick}
            className={classes.button}
            data-active={f.active || undefined}
            aria-pressed={f.active}
          >
            {body}
          </UnstyledButton>
        ) : (
          <div key={f.label}>{body}</div>
        );
      })}
    </SimpleGrid>
  );
}
