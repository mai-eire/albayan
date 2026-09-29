"use client";

import { Badge, Button, Group, Popover, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSchool } from "@tabler/icons-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Field } from "@/components/Field";
import type { LessonDay } from "@/lib/calendar";
import { formatDate } from "@/lib/time";

type Props = {
  lesson: LessonDay;
  date: string;
  timezone: string;
  // The office can open the session itself; nobody else has a page to go to.
  staff?: boolean;
  children: (open: () => void) => ReactNode;
};

// A class day on the calendar: when it runs, and for the office a way into the session
// (§4.10). There is little to say about a weekly session, and that is the point — the
// popover answers "what time?" without leaving the calendar.
export function SessionPopover({ lesson, date, timezone, staff, children }: Props) {
  const [opened, { close, toggle }] = useDisclosure(false);
  return (
    <Popover opened={opened} onChange={close} position="bottom-start" shadow="md" width={260}>
      <Popover.Target>{children(toggle) as never}</Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Group gap="xs">
            <Badge
              color="tile"
              variant="light"
              leftSection={<IconSchool size={12} stroke={1.75} />}
            >
              Class day
            </Badge>
          </Group>
          <Text fw={600}>{lesson.label}</Text>
          <Field label="When" value={formatDate(date, timezone, true)} />
          <Field label="Hours" value={`${lesson.startTime} – ${lesson.endTime}`} />
          {staff && (
            <Button
              component={Link}
              href={`/admin/academics/sessions/${lesson.sessionId}`}
              variant="light"
              size="xs"
            >
              Session details
            </Button>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
