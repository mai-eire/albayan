"use client";

import { Badge, Button, Group, Popover, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { ReactNode } from "react";
import { EventIcon } from "@/components/EventIcon";
import { Field } from "@/components/Field";
import type { EventRow } from "@/lib/db/queries/events";
import { eventLook, eventTypeLabels, isStaffOnly, whenLabel } from "@/lib/events";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/time";

type Props = {
  event: EventRow;
  timezone: string;
  // The office's Edit and Delete; nobody else gets either.
  onEdit?: (event: EventRow) => void;
  onDelete?: (event: EventRow) => void;
  children: (open: () => void) => ReactNode;
};

// What the school knows about one entry (DESIGN §4.10), opened from a chip on the grid or a
// row in the schedule. The only place a description is shown on a calendar.
export function EventPopover({ event, timezone, onEdit, onDelete, children }: Props) {
  const [opened, { close, toggle }] = useDisclosure(false);
  const look = eventLook(event.type);
  const when = whenLabel(event, (date) => formatDate(date, timezone, true));
  const who = isStaffOnly(event)
    ? "Staff only"
    : event.targetNames.length
      ? event.targetNames.join(", ")
      : "The whole school";
  return (
    <Popover opened={opened} onChange={close} position="bottom-start" shadow="md" width={280}>
      <Popover.Target>{children(toggle) as never}</Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Group gap="xs" wrap="nowrap">
            <Badge
              color={look.color}
              variant="light"
              leftSection={<EventIcon type={event.type} size={12} />}
            >
              {eventTypeLabels[event.type]}
            </Badge>
            {!event.isPublished && (
              <Badge color="saffron" variant="light">
                Draft
              </Badge>
            )}
          </Group>
          <Text fw={600}>{event.title}</Text>
          <Field label="When" value={when} />
          {event.location && <Field label="Where" value={event.location} />}
          <Field label="Who it is for" value={who} />
          {event.feeCents ? <Field label="Cost" value={formatEuros(event.feeCents)} /> : null}
          {event.description && (
            <Text size="sm" c="dimmed">
              {event.description}
            </Text>
          )}
          {(onEdit || onDelete) && (
            <Group gap="xs" grow>
              {onEdit && (
                <Button
                  variant="light"
                  size="xs"
                  onClick={() => {
                    close();
                    onEdit(event);
                  }}
                >
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="light"
                  color="clay"
                  size="xs"
                  onClick={() => {
                    close();
                    onDelete(event);
                  }}
                >
                  Delete
                </Button>
              )}
            </Group>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
