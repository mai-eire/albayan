import { Stack, Text, ThemeIcon } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  message: string;
  action?: ReactNode;
};

// One icon, one sentence, one action (§4.9).
export function EmptyState({ icon, message, action }: Props) {
  return (
    <Stack align="center" gap="sm" py="xl">
      <ThemeIcon variant="light" size="xl" radius="xl">
        {icon}
      </ThemeIcon>
      <Text c="dimmed" ta="center" maw={400}>
        {message}
      </Text>
      {action}
    </Stack>
  );
}
