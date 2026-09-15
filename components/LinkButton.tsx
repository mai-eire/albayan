"use client";

import Link from "next/link";
import { Button, type ButtonProps } from "@mantine/core";

// A Button that navigates. Server Components can't pass `component={Link}` to a
// client component themselves, so this wrapper does it.
export function LinkButton({
  href,
  ...props
}: ButtonProps & { href: string; children: React.ReactNode }) {
  return <Button component={Link} href={href} {...props} />;
}
