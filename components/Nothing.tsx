import { Text } from "@mantine/core";

// An empty cell or field says what is missing, in a dimmed word — "no teacher", "not
// placed", "none" — never a dash (DESIGN §7).
export function Nothing({ children = "none" }: { children?: string }) {
  return (
    <Text component="span" size="sm" c="dimmed">
      {children}
    </Text>
  );
}
