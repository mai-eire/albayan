import { Card, Text } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./ReviewCard.module.css";

// The "what you are about to do" block in a modal (§4.8): tile-tinted so it stands apart
// from the form above it. The title says what — "Offering", "Moving to".
export function ReviewCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className={classes.card} padding="md">
      <Text size="sm" fw={600} mb="xs">
        {title}
      </Text>
      {children}
    </Card>
  );
}
