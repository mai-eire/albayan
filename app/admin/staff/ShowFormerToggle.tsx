"use client";

import { Switch } from "@mantine/core";
import { usePathname, useRouter } from "next/navigation";

export function ShowFormerToggle({ checked }: { checked: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Switch
      label="Show former teachers"
      checked={checked}
      onChange={(e) => router.push(e.currentTarget.checked ? `${pathname}?show=all` : pathname)}
    />
  );
}
