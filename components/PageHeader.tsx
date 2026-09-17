import { Breadcrumbs, Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { AppLink } from "./AppLink";

export type Crumb = { label: string; href: string };

type Props = {
  title: string;
  // The pages above this one, in order (§3.2): Students › Ibrahim Nasser. The current page
  // is the title, so it is not repeated.
  breadcrumbs?: Crumb[];
  eyebrow?: ReactNode;
  actions?: ReactNode;
};

// The top of every page: the trail here, the context line, the one h1, the page's actions.
export function PageHeader({ title, breadcrumbs, eyebrow, actions }: Props) {
  return (
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
      <Stack gap={4}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs separator="›" separatorMargin={6} fz="sm" c="dimmed">
            {breadcrumbs.map((c) => (
              <AppLink key={c.href} href={c.href} size="sm" c="dimmed" fw={500}>
                {c.label}
              </AppLink>
            ))}
          </Breadcrumbs>
        )}
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
