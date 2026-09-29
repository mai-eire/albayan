"use client";

import { Group, SegmentedControl, Stack, Switch } from "@mantine/core";
import { useState, type ReactNode } from "react";
import { MonthCalendar } from "@/components/MonthCalendar";
import { ScheduleList } from "@/components/ScheduleList";
import { useUrlFilters } from "@/components/useUrlFilters";
import type { CalendarMonth, LessonDay } from "@/lib/calendar";
import type { EventRow } from "@/lib/db/queries/events";

type Props = {
  month: CalendarMonth;
  base: string;
  // The whole year, for the schedule view; the month grid has its own dates already.
  events: EventRow[];
  today: string;
  timezone: string;
  showDrafts?: boolean;
  onEdit?: (event: EventRow) => void;
  onDelete?: (event: EventRow) => void;
  onAdd?: (date: string) => void;
  staff?: boolean;
  lessons?: { date: string; lesson: LessonDay }[];
  // Sits beside the view switch: the office's "Add entry".
  action?: ReactNode;
  emptyMessage?: string;
  initialView?: string;
  initialClassDays?: string;
};

// A month at a glance or the year as a list, the same dates either way (§4.10). The choice
// lives in the URL so a link keeps it, and both views are already in the browser, so
// switching never goes back to the server.
export function CalendarViews({
  month,
  base,
  initialView,
  initialClassDays,
  action,
  ...list
}: Props) {
  const { set } = useUrlFilters();
  const [view, setView] = useState(initialView === "schedule" ? "schedule" : "month");
  // Off unless asked for: the dates and activities are what the schedule is read for, and
  // the class days are the same two every week (§4.10).
  const [classDays, setClassDays] = useState(initialClassDays === "on");
  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="md" wrap="nowrap">
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
          {/* Beside the view it belongs to: it only shapes the schedule. */}
          {view === "schedule" && (
            <Switch
              size="sm"
              label="Class days"
              checked={classDays}
              onChange={(event) => {
                const next = event.currentTarget.checked;
                setClassDays(next);
                set({ classDays: next ? "on" : null });
              }}
            />
          )}
        </Group>
        {action}
      </Group>
      {view === "month" ? (
        <MonthCalendar
          month={month}
          base={base}
          events={list.events}
          today={list.today}
          timezone={list.timezone}
          onEdit={list.onEdit}
          onDelete={list.onDelete}
          onAdd={list.onAdd}
          staff={list.staff}
        />
      ) : (
        <ScheduleList {...list} lessons={classDays ? list.lessons : []} />
      )}
    </Stack>
  );
}
