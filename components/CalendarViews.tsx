"use client";

import { SegmentedControl, Stack } from "@mantine/core";
import { useState, type ReactNode } from "react";
import { MonthCalendar } from "@/components/MonthCalendar";
import { ScheduleList } from "@/components/ScheduleList";
import { useUrlFilters } from "@/components/useUrlFilters";
import type { CalendarMonth } from "@/lib/calendar";
import type { EventRow } from "@/lib/db/queries/events";

type Props = {
  month: CalendarMonth;
  base: string;
  // The whole year, for the schedule view; the month grid has its own dates already.
  events: EventRow[];
  today: string;
  timezone: string;
  showDrafts?: boolean;
  action?: (event: EventRow) => ReactNode;
  emptyMessage?: string;
  initialView?: string;
};

// A month at a glance or the year as a list, the same dates either way (§4.10). The choice
// lives in the URL so a link keeps it, and both views are already in the browser, so
// switching never goes back to the server.
export function CalendarViews({ month, base, initialView, ...list }: Props) {
  const { set } = useUrlFilters();
  const [view, setView] = useState(initialView === "schedule" ? "schedule" : "month");
  return (
    <Stack gap="md">
      <SegmentedControl
        value={view}
        onChange={(next) => {
          setView(next);
          set({ view: next === "month" ? null : next });
        }}
        data={[
          { value: "month", label: "Month" },
          { value: "schedule", label: "Schedule" },
        ]}
        size="xs"
        w="fit-content"
      />
      {view === "month" ? <MonthCalendar month={month} base={base} /> : <ScheduleList {...list} />}
    </Stack>
  );
}
