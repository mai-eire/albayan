"use client";

import { Group, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { IconCalendar } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/EmptyState";
import { EventIcon } from "@/components/EventIcon";
import { EventPopover } from "@/components/EventPopover";
import { StatusBadge } from "@/components/StatusBadge";
import type { EventRow } from "@/lib/db/queries/events";
import { eventLook, eventTypeLabels, isStaffOnly, isUpcoming, whenLabel } from "@/lib/events";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/time";
import classes from "./ScheduleList.module.css";

type Props = {
  events: EventRow[];
  today: string;
  timezone: string;
  // The office sees drafts and can act on a row; nobody else does.
  showDrafts?: boolean;
  onEdit?: (event: EventRow) => void;
  action?: (event: EventRow) => ReactNode;
  emptyMessage?: string;
};

// The year as a list rather than a grid (§4.10): what is coming up, then what has been.
// Each row wears its kind — the colour and icon of the chip it has on the month — and
// opens the same popover.
export function ScheduleList({
  events,
  today,
  timezone,
  showDrafts,
  onEdit,
  action,
  emptyMessage,
}: Props) {
  const upcoming = events.filter((e) => isUpcoming(e, today));
  const past = events.filter((e) => !isUpcoming(e, today)).reverse();

  const row = (event: EventRow) => {
    const detail = [
      whenLabel(event, (date) => formatDate(date, timezone)),
      eventTypeLabels[event.type],
      event.location,
      isStaffOnly(event)
        ? "Staff only"
        : event.targetNames.length
          ? event.targetNames.join(", ")
          : null,
      event.feeCents ? formatEuros(event.feeCents) : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <div key={event.id} className={classes.row} data-color={eventLook(event.type).color}>
        <Group justify="space-between" wrap="nowrap" gap="sm">
          <EventPopover event={event} timezone={timezone} onEdit={onEdit}>
            {(open) => (
              <UnstyledButton onClick={open} className={classes.main}>
                <Group gap="sm" wrap="nowrap">
                  <ThemeIcon variant="light" color={eventLook(event.type).color} radius="md">
                    <EventIcon type={event.type} size={16} />
                  </ThemeIcon>
                  <div className={classes.text}>
                    <Text fw={500} truncate>
                      {event.title}
                    </Text>
                    <Text size="sm" c="dimmed" truncate>
                      {detail}
                    </Text>
                  </div>
                </Group>
              </UnstyledButton>
            )}
          </EventPopover>
          <Group gap="xs" wrap="nowrap">
            {showDrafts && !event.isPublished && <StatusBadge domain="publication" value="draft" />}
            {action?.(event)}
          </Group>
        </Group>
      </div>
    );
  };

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<IconCalendar size={20} stroke={1.75} />}
        message={emptyMessage ?? "Nothing on the calendar yet."}
      />
    );
  }
  return (
    <Stack gap="lg">
      {upcoming.length > 0 && (
        <Stack gap="xs">
          <Text size="sm" c="dimmed" fw={500}>
            Coming up
          </Text>
          {upcoming.map(row)}
        </Stack>
      )}
      {past.length > 0 && (
        <Stack gap="xs">
          <Text size="sm" c="dimmed" fw={500}>
            Earlier this year
          </Text>
          {past.map(row)}
        </Stack>
      )}
    </Stack>
  );
}
