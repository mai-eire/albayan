"use client";

import { Button, Card, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarViews } from "@/components/CalendarViews";
import { confirmDestructive } from "@/components/confirm";
import { toast } from "@/components/toast";
import type { CalendarMonth, LessonDay } from "@/lib/calendar";
import type { EventRow } from "@/lib/db/queries/events";
import { deleteEvent } from "./actions";
import { EventModal } from "./EventModal";

type Props = {
  month: CalendarMonth;
  events: EventRow[];
  lessons: { date: string; lesson: LessonDay }[];
  sessions: { id: number; name: string }[];
  classes: { id: number; name: string; sessionName: string }[];
  today: string;
  timezone: string;
  view?: string;
  classDays?: string;
  noTerms: boolean;
};

// The office's calendar: the month or the year, the same rows either way, and every way of
// adding or changing an entry hanging off the thing itself — a chip, a row, a day, or the
// button up here. There is no second list: the schedule view is the list.
export function AdminCalendar({
  month,
  events,
  lessons,
  sessions,
  classes,
  today,
  timezone,
  view,
  classDays,
  noTerms,
}: Props) {
  const router = useRouter();
  // A date means "new entry, starting that day"; an entry means "edit this one".
  const [editing, setEditing] = useState<EventRow | string | null>(null);

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
    <>
      <Card>
        <CalendarViews
          month={month}
          base="/admin/calendar"
          initialView={view}
          initialClassDays={classDays}
          events={events}
          lessons={lessons}
          today={today}
          timezone={timezone}
          showDrafts
          staff
          onEdit={setEditing}
          onDelete={remove}
          onAdd={(date) => setEditing(date)}
          action={
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconPlus size={16} stroke={1.75} />}
              onClick={() => setEditing(today)}
            >
              Add entry
            </Button>
          }
          emptyMessage="Nothing on the calendar yet. Add the term's holidays, exams and trips."
        />
        {noTerms && (
          <Text size="sm" c="dimmed" mt="md">
            Term dates haven&apos;t been set yet — add them under Academics.
          </Text>
        )}
      </Card>
      {editing && (
        <EventModal
          key={typeof editing === "string" ? editing : editing.id}
          opened
          onClose={() => setEditing(null)}
          existing={typeof editing === "string" ? null : editing}
          startDate={typeof editing === "string" ? editing : undefined}
          sessions={sessions}
          classes={classes}
          today={today}
        />
      )}
    </>
  );
}
