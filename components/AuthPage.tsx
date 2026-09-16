"use client";

import { Anchor, Card, Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconSchool } from "@tabler/icons-react";
import Link from "next/link";
import type { ReactNode } from "react";
import classes from "./AuthPage.module.css";

type Props = {
  schoolName: string;
  title: string;
  children: ReactNode;
  // Links under the card, e.g. [{ href: "/login", label: "Back to sign in" }].
  links?: { href: string; label: string }[];
};

// Sign-in pages (§3.5): no shell, mark and name, one card with the form.
export function AuthPage({ schoolName, title, children, links = [] }: Props) {
  return (
    <main className={classes.main}>
      <Stack align="center" gap="lg" w="100%" maw={420} mx="auto">
        <Group gap="sm">
          <ThemeIcon size={36} radius="md">
            <IconSchool size={20} stroke={1.75} />
          </ThemeIcon>
          <Title order={4}>{schoolName}</Title>
        </Group>
        <Card w="100%">
          <Title order={2} mb="md">
            {title}
          </Title>
          {children}
        </Card>
        {links.map((link) => (
          <Anchor key={link.href} component={Link} href={link.href} size="sm">
            {link.label}
          </Anchor>
        ))}
        <Text size="xs" c="dimmed" ta="center">
          Trouble signing in? Contact the school office.
        </Text>
      </Stack>
    </main>
  );
}
