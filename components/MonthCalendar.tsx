"use client";

import { ActionIcon, Group, Stack, Text, Title } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import { DirectionalIcon } from "@/components/DirectionalIcon";
import type { CalendarMonth } from "@/lib/calendar";
import classes from "./MonthCalendar.module.css";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// A month grid (§4.10): term days on the ground colour, lesson days carry their label,
// today is ringed in saffron. `base` is the page the month links go to (?month=).
export function MonthCalendar({ month, base }: { month: CalendarMonth; base: string }) {
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
            aria-label={[day.date, ...day.lessons, ...day.events].join(", ")}
          >
            <span className={classes.number}>{day.dayOfMonth}</span>
            {day.lessons.map((l) => (
              <span key={l} className={classes.lesson}>
                {l}
              </span>
            ))}
            {day.events.map((e) => (
              <span key={e} className={classes.event}>
                {e}
              </span>
            ))}
          </div>
        ))}
      </div>
    </Stack>
  );
}
