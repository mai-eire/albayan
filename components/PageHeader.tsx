import { Breadcrumbs, Group, Stack, Text, Title } from "@mantine/core";
import { IconArrowUpRight, IconChevronLeft } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { AppLink } from "./AppLink";
import { DirectionalIcon } from "./DirectionalIcon";
import { LinkButton } from "./LinkButton";

export type Crumb = { label: string; href: string };

type Props = {
  title: string;
  // The pages above this one, in order (§3.2): Students › Ibrahim Nasser. The current page
  // is the title, so it is not repeated.
  breadcrumbs?: Crumb[];
  eyebrow?: ReactNode;
  // One line under the title for the page's standing summary ("Autumn term · 3 registers
  // still to come"); it stays put when the page's view changes.
  subtitle?: ReactNode;
  // The entity's status badge, beside the name (a student's "Applied", a staff account's "Invited").
  badge?: ReactNode;
  // Another page about the same thing, reached from here but not above it in the URL
  // ("Level 4's attendance" from a register): a subtle link before the actions (§3.2).
  related?: Crumb;
  actions?: ReactNode;
};

// The top of every page: the trail here, the context line, the one h1, the page's actions.
export function PageHeader({
  title,
  breadcrumbs,
  eyebrow,
  subtitle,
  badge,
  related,
  actions,
}: Props) {
  return (
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
      <Stack gap={4}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Group gap={2} wrap="nowrap">
            <DirectionalIcon icon={IconChevronLeft} size={16} color="var(--mantine-color-anchor)" />
            <Breadcrumbs separator="›" separatorMargin={6} fz="sm">
              {breadcrumbs.map((c) => (
                <AppLink key={c.href} href={c.href} size="sm" fw={500}>
                  {c.label}
                </AppLink>
              ))}
            </Breadcrumbs>
          </Group>
        )}
        {eyebrow && (
          <Text size="sm" c="dimmed" fw={500}>
            {eyebrow}
          </Text>
        )}
        <Group gap="sm" align="center" wrap="nowrap">
          <Title order={1}>{title}</Title>
          {badge}
        </Group>
        {subtitle && (
          <Text size="sm" c="dimmed">
            {subtitle}
          </Text>
        )}
      </Stack>
      {(related || actions) && (
        <Group gap="xs">
          {related && (
            <LinkButton
              href={related.href}
              variant="subtle"
              size="sm"
              rightSection={<IconArrowUpRight size={14} stroke={1.75} />}
            >
              {related.label}
            </LinkButton>
          )}
          {actions}
        </Group>
      )}
    </Group>
  );
}
