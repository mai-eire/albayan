import { Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  title: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
};

// The top of every page: context line, the one h1, the page's actions (§3.2).
export function PageHeader({ title, eyebrow, actions }: Props) {
  return (
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
      <Stack gap={4}>
        {eyebrow && (
          <Text size="sm" c="dimmed" fw={500}>
            {eyebrow}
          </Text>
        )}
        <Title order={1}>{title}</Title>
      </Stack>
      {actions && <Group gap="xs">{actions}</Group>}
    </Group>
  );
}
