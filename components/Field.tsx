import { Text } from "@mantine/core";
import type { ReactNode } from "react";

// A read-only label/value pair for profile cards and review steps (§4.7). Lay several out
// in a SimpleGrid; "—" stands in for nothing.
export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm">{value || "—"}</Text>
    </div>
  );
}
