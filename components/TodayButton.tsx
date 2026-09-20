"use client";

import { Button, type ButtonProps } from "@mantine/core";
import { IconCalendarEvent } from "@tabler/icons-react";
import { useUrlFilters } from "./useUrlFilters";

// Narrows a dated list to today (the `date` filter) and back; lives with the page's
// actions, not among the filters (§4.5).
export function TodayButton({ today, ...props }: ButtonProps & { today: string }) {
  const { params, set } = useUrlFilters();
  const on = params.get("date") === today;
  return (
    <Button
      variant={on ? "light" : "default"}
      leftSection={<IconCalendarEvent size={16} stroke={1.75} />}
      aria-pressed={on}
      onClick={() => set({ date: on ? null : today })}
      {...props}
    >
      Today
    </Button>
  );
}
