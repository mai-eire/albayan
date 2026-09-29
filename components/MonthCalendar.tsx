"use client";

import { ActionIcon, Button, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { DirectionalIcon } from "@/components/DirectionalIcon";
import { EventIcon } from "@/components/EventIcon";
import { EventPopover } from "@/components/EventPopover";
import { SessionPopover } from "@/components/SessionPopover";
import type { CalendarMonth } from "@/lib/calendar";
import type { EventRow } from "@/lib/db/queries/events";
import { eventLook } from "@/lib/events";
import classes from "./MonthCalendar.module.css";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  month: CalendarMonth;
  // The page the month arrows link to (?month=).
  base: string;
  // The year's entries, so a chip can open what the school knows about it.
  events: EventRow[];
  today: string;
  timezone: string;
  onEdit?: (event: EventRow) => void;
  onDelete?: (event: EventRow) => void;
  // The office only: add an entry on a day, and open a session from its chip.
  onAdd?: (date: string) => void;
  staff?: boolean;
};

// A month grid (§4.10): term days on the ground colour, lesson days carry their label,
// today is ringed in saffron, and each entry is a chip in its own colour that opens a
// popover.
export function MonthCalendar({
  month,
  base,
  events,
  today,
  timezone,
  onEdit,
  onDelete,
  onAdd,
  staff,
}: Props) {
  const byId = new Map(events.map((e) => [e.id, e]));
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Title order={3}>{month.title}</Title>
        <Group gap="xs">
          {/* Only when it would do something, and before the arrows so it appears without
              moving them. */}
          {month.month !== today.slice(0, 7) && (
            <Button
              component={Link}
              href={`${base}?month=${today.slice(0, 7)}`}
              variant="default"
              size="xs"
            >
              Today
            </Button>
          )}
          <ActionIcon
            component={Link}
            href={`${base}?month=${month.previous}`}
            variant="default"
            aria-label="Previous month"
          >
            <DirectionalIcon icon={IconChevronLeft} size={16} />
          </ActionIcon>
          <ActionIcon
            component={Link}
            href={`${base}?month=${month.next}`}
            variant="default"
            aria-label="Next month"
          >
            <DirectionalIcon icon={IconChevronRight} size={16} />
          </ActionIcon>
        </Group>
      </Group>
      <div className={classes.grid} role="grid">
        {weekdays.map((d) => (
          <Text key={d} size="xs" c="dimmed" ta="center" fw={500}>
            {d}
          </Text>
        ))}
        {month.weeks.flat().map((day) => (
          <div
            key={day.date}
            className={classes.day}
            data-in-month={day.inMonth || undefined}
            data-term={day.termName ? "" : undefined}
            data-today={day.isToday || undefined}
            data-lesson={day.lessons.length ? "" : undefined}
            aria-label={[
              day.date,
              ...day.lessons.map((l) => l.label),
              ...day.events.map((e) => e.title),
            ].join(", ")}
          >
            <Group justify="space-between" wrap="nowrap" gap={2}>
              <span className={classes.number}>{day.dayOfMonth}</span>
              {onAdd && (
                <UnstyledButton
                  className={classes.add}
                  onClick={() => onAdd(day.date)}
                  aria-label={`Add an entry on ${day.date}`}
                >
                  <IconPlus size={12} stroke={2} />
                </UnstyledButton>
              )}
            </Group>
            {day.lessons.map((lesson) => (
              <SessionPopover
                key={`${lesson.sessionId}-${lesson.label}`}
                lesson={lesson}
                date={day.date}
                timezone={timezone}
                staff={staff}
              >
                {(open) => (
                  <UnstyledButton
                    onClick={open}
                    className={classes.lesson}
                    aria-label={`${lesson.label} — ${lesson.startTime} to ${lesson.endTime}`}
                  >
                    {lesson.label}
                  </UnstyledButton>
                )}
              </SessionPopover>
            ))}
            {day.events.map((entry) => {
              const event = byId.get(entry.id);
              if (!event) return null;
              return (
                <EventPopover
                  key={entry.id}
                  event={event}
                  timezone={timezone}
                  onEdit={onEdit}
                  onDelete={onDelete}
                >
                  {(open) => (
                    <UnstyledButton
                      onClick={open}
                      className={classes.event}
                      data-color={eventLook(event.type).color}
                      aria-label={`${event.title} — ${entry.date}`}
                    >
                      <EventIcon type={event.type} size={12} />
                      <span className={classes.eventTitle}>{event.title}</span>
                    </UnstyledButton>
                  )}
                </EventPopover>
              );
            })}
          </div>
        ))}
      </div>
    </Stack>
  );
}
