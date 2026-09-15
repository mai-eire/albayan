import { Card, Text } from "@mantine/core";
import classes from "./StatTile.module.css";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  // Only when the number itself is a status ("3 registers missing" → "saffron").
  color?: "saffron" | "clay";
};

// Admin dashboard only, at most three (§3.3, §4.4).
export function StatTile({ label, value, hint, color }: Props) {
  return (
    <Card>
      <Text size="sm" c="dimmed" fw={500}>
        {label}
      </Text>
      <Text className={classes.value} c={color}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Card>
  );
}
