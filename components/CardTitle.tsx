import { Group, Title } from "@mantine/core";
import type { ReactNode } from "react";

// h3 at the top of a card, with optional context on the end side (a badge, a subtle button).
export function CardTitle({ children, context }: { children: ReactNode; context?: ReactNode }) {
  return (
    <Group justify="space-between" align="center" mb="md" wrap="nowrap">
      <Title order={3}>{children}</Title>
      {context}
    </Group>
  );
}
