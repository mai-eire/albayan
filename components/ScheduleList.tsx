"use client";

import { Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { EntityList, type EntityListItem } from "@/components/EntityList";
import { EmptyState } from "@/components/EmptyState";
import { IconCalendar } from "@tabler/icons-react";
import { StatusBadge } from "@/components/StatusBadge";
import type { EventRow } from "@/lib/db/queries/events";
import { eventTypeLabels, isUpcoming, whenLabel } from "@/lib/events";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/time";

type Props = {
  events: EventRow[];
  today: string;
  // The school's timezone. A function can't cross the server boundary, and formatting is
  // pure, so the dates are turned into words here.
  timezone: string;
  // The office sees drafts and can act on a row; nobody else does.
  showDrafts?: boolean;
  action?: (event: EventRow) => ReactNode;
  emptyMessage?: string;
};

// The year as a list rather than a grid (§4.10): what is coming up, then what has been.
// The same rows for the office and for a family; only the actions differ.
export function ScheduleList({ events, today, timezone, showDrafts, action, emptyMessage }: Props) {
  const upcoming = events.filter((e) => isUpcoming(e, today));
  const past = events.filter((e) => !isUpcoming(e, today)).reverse();

  const item = (event: EventRow): EntityListItem => ({
    key: event.id,
    title: event.title,
    detail: [
      whenLabel(event, (date) => formatDate(date, timezone)),
      eventTypeLabels[event.type],
      event.location,
      event.targetNames.length ? event.targetNames.join(", ") : null,
      event.feeCents ? formatEuros(event.feeCents) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    badge:
      showDrafts && !event.isPublished ? (
        <StatusBadge domain="publication" value="draft" />
      ) : undefined,
    action: action?.(event),
  });

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
          <EntityList items={upcoming.map(item)} />
        </Stack>
      )}
      {past.length > 0 && (
        <Stack gap="xs">
          <Text size="sm" c="dimmed" fw={500}>
            Earlier this year
          </Text>
          <EntityList items={past.map(item)} />
        </Stack>
      )}
    </Stack>
  );
}
