"use client";

import {
  Button,
  Checkbox,
  Group,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/DateField";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import type { EventRow } from "@/lib/db/queries/events";
import { eventTypes, type EventAudience } from "@/lib/db/schema";
import { dateOf, eventTypeLabels, isActivity, timeOf } from "@/lib/events";
import { formatEuros } from "@/lib/money";
import { saveEvent } from "./actions";

type Props = {
  opened: boolean;
  onClose: () => void;
  existing?: EventRow | null;
  sessions: { id: number; name: string }[];
  classes: { id: number; name: string; sessionName: string }[];
  today: string;
};

// The school's dates first: they are what the office adds most.
const typeOptions = [
  {
    group: "School dates",
    items: ["holiday", "closure", "exam", "parent_teacher_meeting", "other"],
  },
  {
    group: "Activities",
    items: ["trip", "camp", "summer_school", "club", "sports_day", "community"],
  },
].map((g) => ({
  group: g.group,
  items: g.items.map((value) => ({ value, label: eventTypeLabels[value as never] })),
}));

const audienceOptions: { value: EventAudience; label: string }[] = [
  { value: "whole_school", label: "The whole school" },
  { value: "selected_sessions", label: "Some days" },
  { value: "selected_classes", label: "Some classes" },
];

export function EventModal({ opened, onClose, existing, sessions, classes, today }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm({
    initialValues: {
      title: existing?.title ?? "",
      type: existing?.type ?? "holiday",
      description: existing?.description ?? "",
      startDate: existing ? dateOf(existing.startAt) : today,
      endDate: existing ? dateOf(existing.endAt) : today,
      startTime: existing ? (timeOf(existing.startAt) ?? "") : "",
      endTime: existing ? (timeOf(existing.endAt) ?? "") : "",
      location: existing?.location ?? "",
      audience: existing?.audience ?? ("whole_school" as EventAudience),
      sessionIds: (existing?.sessionIds ?? []).map(String),
      classIds: (existing?.classIds ?? []).map(String),
      fee: existing?.feeCents ? formatEuros(existing.feeCents).replace(/[€,]/g, "") : "",
      publish: existing?.isPublished ?? true,
    },
  });

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = await saveEvent({
      id: existing?.id,
      title: values.title,
      type: values.type,
      description: values.description || null,
      startDate: values.startDate,
      endDate: values.endDate,
      startTime: values.startTime || null,
      endTime: values.endTime || null,
      location: values.location || null,
      audience: values.audience,
      sessionIds: values.sessionIds.map(Number),
      classIds: values.classIds.map(Number),
      fee: values.fee || null,
      publish: values.publish,
    });
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(existing ? "Calendar entry saved" : "Added to the calendar");
    onClose();
    router.refresh();
  });

  const activity = isActivity(form.values.type);
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={existing ? "Edit calendar entry" : "Add to the calendar"}
      size="lg"
    >
      <form onSubmit={submit}>
        <Stack gap="md">
          <Group grow align="flex-start">
            <TextInput
              label="Name"
              placeholder="Mid-term break"
              withAsterisk
              data-autofocus
              {...form.getInputProps("title")}
            />
            <Select
              label="What it is"
              data={typeOptions}
              allowDeselect={false}
              withAsterisk
              {...form.getInputProps("type")}
            />
          </Group>
          <Group grow align="flex-start">
            <DateField label="First day" withAsterisk {...form.getInputProps("startDate")} />
            <DateField
              label="Last day"
              withAsterisk
              minDate={form.values.startDate}
              {...form.getInputProps("endDate")}
            />
          </Group>
          <Group grow align="flex-start">
            <TextInput
              label="Starts at"
              placeholder="All day"
              {...form.getInputProps("startTime")}
            />
            <TextInput label="Ends at" placeholder="All day" {...form.getInputProps("endTime")} />
          </Group>
          <Group grow align="flex-start">
            <TextInput
              label="Where"
              placeholder="The school hall"
              {...form.getInputProps("location")}
            />
            <Select
              label="Who it is for"
              data={audienceOptions}
              allowDeselect={false}
              {...form.getInputProps("audience")}
            />
          </Group>
          {form.values.audience === "selected_sessions" && (
            <MultiSelect
              label="Which days"
              data={sessions.map((s) => ({ value: String(s.id), label: s.name }))}
              withAsterisk
              {...form.getInputProps("sessionIds")}
            />
          )}
          {form.values.audience === "selected_classes" && (
            <MultiSelect
              label="Which classes"
              data={classes.map((c) => ({
                value: String(c.id),
                label: `${c.name} · ${c.sessionName}`,
              }))}
              searchable
              withAsterisk
              {...form.getInputProps("classIds")}
            />
          )}
          <Textarea
            label="Details"
            placeholder="What families need to know"
            autosize
            minRows={2}
            {...form.getInputProps("description")}
          />
          {activity && (
            <TextInput
              label="Cost"
              leftSection="€"
              placeholder="Free"
              description="Shown to families; the money is collected outside the app."
              {...form.getInputProps("fee")}
            />
          )}
          <Checkbox
            label="Show it to families and students"
            description="Leave it off to keep it as a draft until the dates are settled."
            {...form.getInputProps("publish", { type: "checkbox" })}
          />
          <FormError message={error} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {existing ? "Save entry" : "Add entry"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
