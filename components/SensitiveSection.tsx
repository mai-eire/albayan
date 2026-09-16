import { Card, Group, Text, ThemeIcon, Title } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import type { ReactNode } from "react";

export const sensitiveExplanation =
  "Optional. Used only for anonymous diversity statistics. It has no effect on any admission or placement decision.";

// Admin-only card for ethnicity, languages, reasons and address (§5). Never rendered to teachers.
export function SensitiveSection({ children }: { children: ReactNode }) {
  return (
    <Card>
      <Group gap="sm" mb="xs">
        <ThemeIcon variant="light" color="gray" size="md" radius="md">
          <IconLock size={16} stroke={1.75} />
        </ThemeIcon>
        <Title order={3}>Sensitive information</Title>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        {sensitiveExplanation}
      </Text>
      {children}
    </Card>
  );
}
