"use client";

import { ActionIcon, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import { DirectionalIcon } from "@/components/DirectionalIcon";
import { EventIcon } from "@/components/EventIcon";
import { EventPopover } from "@/components/EventPopover";
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
  timezone: string;
  onEdit?: (event: EventRow) => void;
};

// A month grid (§4.10): term days on the ground colour, lesson days carry their label,
// today is ringed in saffron, and each entry is a chip in its own colour that opens a
// popover.
export function MonthCalendar({ month, base, events, timezone, onEdit }: Props) {
  const byId = new Map(events.map((e) => [e.id, e]));
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Title order={3}>{month.title}</Title>
        <Group gap="xs">
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
            aria-label={[day.date, ...day.lessons, ...day.events.map((e) => e.title)].join(", ")}
          >
            <span className={classes.number}>{day.dayOfMonth}</span>
            {day.lessons.map((l, i) => (
              <span key={`${l}-${i}`} className={classes.lesson}>
                {l}
              </span>
            ))}
            {day.events.map((entry) => {
              const event = byId.get(entry.id);
              if (!event) return null;
              return (
                <EventPopover key={entry.id} event={event} timezone={timezone} onEdit={onEdit}>
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
