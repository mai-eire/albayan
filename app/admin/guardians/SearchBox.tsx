"use client";

import { TextInput } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const search = useDebouncedCallback((q: string) => {
    router.push(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname);
  }, 300);
  return (
    <TextInput
      aria-label="Search"
      placeholder="Name or email"
      leftSection={<IconSearch size={16} stroke={1.75} />}
      defaultValue={params.get("q") ?? ""}
      onChange={(e) => search(e.currentTarget.value)}
      w={{ base: "100%", xs: 280 }}
    />
  );
}
