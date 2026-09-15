"use client";

import { MantineProvider } from "@mantine/core";
import { cssVariablesResolver, theme } from "@/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      {children}
    </MantineProvider>
  );
}
