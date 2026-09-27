"use client";

import { Anchor, Card, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";
import type { ReactNode } from "react";
import { SchoolMark } from "./SchoolMark";
import classes from "./AuthPage.module.css";

type Props = {
  schoolName: string;
  // The school's own logo, if they have uploaded one. Bigger here than in the header:
  // this is the first thing anyone sees of the school.
  logo?: string | null;
  title: string;
  children: ReactNode;
  // Links under the card, e.g. [{ href: "/login", label: "Back to sign in" }].
  links?: { href: string; label: string }[];
};

// Sign-in pages (§3.5): no shell, mark and name, one card with the form.
export function AuthPage({ schoolName, logo = null, title, children, links = [] }: Props) {
  return (
    <main className={classes.main}>
      <Stack align="center" gap="lg" w="100%" maw={420} mx="auto">
        {/* Mark, then name, then the form: the school's own logo is the first thing
            anyone sees of them, so it gets a line of its own and a generous size. */}
        <Stack align="center" gap="xs">
          <SchoolMark logo={logo} size={logo ? 88 : 56} maxWidth={300} />
          <Title order={4} ta="center">
            {schoolName}
          </Title>
        </Stack>
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
