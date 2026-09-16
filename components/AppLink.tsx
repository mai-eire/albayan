"use client";

import { Anchor, type AnchorProps } from "@mantine/core";
import Link from "next/link";

// A Mantine Anchor that navigates client-side. Server Components can't pass
// component={Link} themselves, so this wrapper does it.
export function AppLink({
  href,
  ...props
}: AnchorProps & { href: string; children: React.ReactNode }) {
  return <Anchor component={Link} href={href} {...props} />;
}
