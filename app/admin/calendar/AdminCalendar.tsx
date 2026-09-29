"use client";

import { Button, Card, Menu, Stack, Text } from "@mantine/core";
import { IconDots, IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarViews } from "@/components/CalendarViews";
import { CardTitle } from "@/components/CardTitle";
import { confirmDestructive } from "@/components/confirm";
import { ScheduleList } from "@/components/ScheduleList";
import { toast } from "@/components/toast";
import type { CalendarMonth } from "@/lib/calendar";
import type { EventRow } from "@/lib/db/queries/events";
import { deleteEvent } from "./actions";
import { EventModal } from "./EventModal";

type Props = {
  month: CalendarMonth;
  events: EventRow[];
  sessions: { id: number; name: string }[];
  classes: { id: number; name: string; sessionName: string }[];
  today: string;
  timezone: string;
  view?: string;
  noTerms: boolean;
};

// The office's calendar and its list are one component because they share one form: a chip
// on the grid and a row in the list both open the entry that is already on screen.
export function AdminCalendar({
  month,
  events,
  sessions,
  classes,
  today,
  timezone,
  view,
  noTerms,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<EventRow | "new" | null>(null);

  const remove = (event: EventRow) =>
    confirmDestructive({
      title: "Delete this entry?",
      message: `This takes ${event.title} off the calendar for everyone. This cannot be undone.`,
      confirmLabel: "Delete entry",
      onConfirm: async () => {
        const result = await deleteEvent({ id: event.id });
        if (result.ok) {
          toast.success("Entry deleted");
          router.refresh();
        } else toast.error(result.error);
      },
    });

  return (
    <Stack gap="lg">
      <Card>
        <CalendarViews
          month={month}
          base="/admin/calendar"
          initialView={view}
          events={events}
          today={today}
          timezone={timezone}
          showDrafts
          onEdit={(event) => setEditing(event)}
          emptyMessage="Nothing on the calendar yet."
        />
        {noTerms && (
          <Text size="sm" c="dimmed" mt="md">
            Term dates haven&apos;t been set yet — add them under Academics.
          </Text>
        )}
      </Card>
      <Card>
        <CardTitle
          context={
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconPlus size={16} stroke={1.75} />}
              onClick={() => setEditing("new")}
            >
              Add entry
            </Button>
          }
        >
          Dates and activities
        </CardTitle>
        <CalendarList
          events={events}
          today={today}
          timezone={timezone}
          onEdit={setEditing}
          onDelete={remove}
        />
      </Card>
      {editing && (
        <EventModal
          key={editing === "new" ? "new" : editing.id}
          opened
          onClose={() => setEditing(null)}
          existing={editing === "new" ? null : editing}
          sessions={sessions}
          classes={classes}
          today={today}
        />
      )}
    </Stack>
  );
}

// The list under the calendar: the same rows families read, with the office's menu on each.
function CalendarList({
  events,
  today,
  timezone,
  onEdit,
  onDelete,
}: {
  events: EventRow[];
  today: string;
  timezone: string;
  onEdit: (event: EventRow) => void;
  onDelete: (event: EventRow) => void;
}) {
  return (
    <ScheduleList
      events={events}
      today={today}
      timezone={timezone}
      showDrafts
      onEdit={onEdit}
      emptyMessage="Nothing on the calendar yet. Add the term's holidays, exams and trips."
      action={(event) => (
        <Menu shadow="md" position="bottom-end">
          <Menu.Target>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              aria-label={`Actions for ${event.title}`}
            >
              <IconDots size={16} stroke={1.75} />
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={() => onEdit(event)}>Edit entry</Menu.Item>
            <Menu.Item color="clay" onClick={() => onDelete(event)}>
              Delete entry
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    />
  );
}
