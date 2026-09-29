"use client";

import { Group, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { IconCalendar } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/EmptyState";
import { EventIcon } from "@/components/EventIcon";
import { EventPopover } from "@/components/EventPopover";
import { SessionPopover } from "@/components/SessionPopover";
import { StatusBadge } from "@/components/StatusBadge";
import { IconSchool } from "@tabler/icons-react";
import { addDays, lessonHorizonDays, type LessonDay } from "@/lib/calendar";
import type { EventRow } from "@/lib/db/queries/events";
import {
  dateOf,
  eventLook,
  eventTypeLabels,
  isStaffOnly,
  isUpcoming,
  whenLabel,
} from "@/lib/events";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/time";
import classes from "./ScheduleList.module.css";

type Props = {
  events: EventRow[];
  // Class days, already expanded across the year's terms; they read between the entries
  // the way a diary would. Only the ones still to come — a list of past Saturdays is no
  // use to anyone and would bury what matters.
  lessons?: { date: string; lesson: LessonDay }[];
  today: string;
  timezone: string;
  // The office sees drafts and can act on a row; nobody else does.
  showDrafts?: boolean;
  onEdit?: (event: EventRow) => void;
  onDelete?: (event: EventRow) => void;
  action?: (event: EventRow) => ReactNode;
  // The office: a session row can open the session itself.
  staff?: boolean;
  emptyMessage?: string;
};

// The year as a list rather than a grid (§4.10): what is coming up, then what has been.
// Each row wears its kind — the colour and icon of the chip it has on the month — and
// opens the same popover.
export function ScheduleList({
  events,
  lessons = [],
  today,
  timezone,
  showDrafts,
  onEdit,
  onDelete,
  action,
  staff,
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
          <EventPopover event={event} timezone={timezone} onEdit={onEdit} onDelete={onDelete}>
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

  // A class day reads as its own row, in date order among the entries.
  const lessonRow = ({ date, lesson }: { date: string; lesson: LessonDay }) => (
    <div key={`${date}-${lesson.sessionId}-${lesson.label}`} className={classes.row} data-lesson="">
      <SessionPopover lesson={lesson} date={date} timezone={timezone} staff={staff}>
        {(open) => (
          <UnstyledButton onClick={open} className={classes.main}>
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon variant="light" color="tile" radius="md">
                <IconSchool size={16} stroke={1.75} />
              </ThemeIcon>
              <div className={classes.text}>
                <Text fw={500} truncate>
                  {lesson.label}
                </Text>
                <Text size="sm" c="dimmed" truncate>
                  {`${formatDate(date, timezone)} · ${lesson.startTime} – ${lesson.endTime}`}
                </Text>
              </div>
            </Group>
          </UnstyledButton>
        )}
      </SessionPopover>
    </div>
  );

  // Entries and class days in one order, the way a diary reads. Class days stop at the
  // horizon; the dates and activities run to the end of the year.
  const horizon = addDays(today, lessonHorizonDays);
  const shownLessons = lessons.filter((l) => l.date >= today && l.date <= horizon);
  const coming = [
    ...upcoming.map((event) => ({ date: dateOf(event.startAt), node: row(event) })),
    ...shownLessons.map((l) => ({ date: l.date, node: lessonRow(l) })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  if (events.length === 0 && coming.length === 0) {
    return (
      <EmptyState
        icon={<IconCalendar size={20} stroke={1.75} />}
        message={emptyMessage ?? "Nothing on the calendar yet."}
      />
    );
  }
  return (
    <Stack gap="lg">
      {coming.length > 0 && (
        <Stack gap="xs">
          <Text size="sm" c="dimmed" fw={500}>
            Coming up
          </Text>
          {coming.map((item) => item.node)}
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
