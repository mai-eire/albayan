"use client";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { cssVariablesResolver, theme } from "@/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      <Notifications position="top-right" autoClose={4000} />
      {children}
    </MantineProvider>
  );
}
