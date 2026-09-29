"use client";

import { Button, Card, Menu } from "@mantine/core";
import { IconDots, IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CardTitle } from "@/components/CardTitle";
import { confirmDestructive } from "@/components/confirm";
import { ScheduleList } from "@/components/ScheduleList";
import { toast } from "@/components/toast";
import type { EventRow } from "@/lib/db/queries/events";
import { deleteEvent } from "./actions";
import { EventModal } from "./EventModal";

type Props = {
  events: EventRow[];
  sessions: { id: number; name: string }[];
  classes: { id: number; name: string; sessionName: string }[];
  today: string;
  timezone: string;
};

// Everything on the calendar as a list, and the one place the office adds to it.
export function EventsCard({ events, sessions, classes, today, timezone }: Props) {
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
      <ScheduleList
        events={events}
        today={today}
        timezone={timezone}
        showDrafts
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
              <Menu.Item onClick={() => setEditing(event)}>Edit entry</Menu.Item>
              <Menu.Item color="clay" onClick={() => remove(event)}>
                Delete entry
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      />
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
    </Card>
  );
}
