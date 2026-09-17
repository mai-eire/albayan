"use client";

import { Button, Group, Modal, Select, Stack, Switch, TextInput } from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import { weekdays } from "@/lib/timetable";
import { createSession, updateSession, type SessionInput } from "./actions";

type Existing = {
  id: number;
  name: string;
  dayOfWeek: number;
  startTime: string;
  isActive: boolean;
};

export function SessionForm({
  academicYearId,
  existing,
  onDone,
}: {
  academicYearId: string;
  existing?: Existing;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<SessionInput>({
    initialValues: {
      academicYearId,
      name: existing?.name ?? "",
      dayOfWeek: existing?.dayOfWeek ?? 6,
      startTime: existing?.startTime ?? "10:00",
      isActive: existing?.isActive ?? true,
    },
  });

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = existing
      ? await updateSession({ id: existing.id, ...values })
      : await createSession(values);
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(existing ? "Session saved" : `${values.name} added`);
    form.resetDirty(values);
    onDone?.();
    const created = result.data;
    if (!existing && created) router.push(`/admin/academics/sessions/${created.id}`);
    else router.refresh();
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <TextInput
          label="Name"
          placeholder="Saturday"
          withAsterisk
          data-autofocus
          {...form.getInputProps("name")}
        />
        <Group grow>
          <Select
            label="Day of the week"
            data={weekdays.map((d, i) => ({ value: String(i), label: d }))}
            allowDeselect={false}
            value={String(form.values.dayOfWeek)}
            onChange={(v) => form.setFieldValue("dayOfWeek", Number(v))}
            error={form.errors.dayOfWeek}
          />
          <TimeInput label="Starts at" {...form.getInputProps("startTime")} />
        </Group>
        {existing && (
          <Switch label="Active" {...form.getInputProps("isActive", { type: "checkbox" })} />
        )}
        <FormError message={error} />
        <Group justify="flex-end">
          {onDone && (
            <Button variant="default" onClick={onDone}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={saving}>
            {existing ? "Save session" : "Add session"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function AddSessionButton({ academicYearId }: { academicYearId: string }) {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button leftSection={<IconPlus size={16} stroke={1.75} />} onClick={open}>
        Add session
      </Button>
      <Modal opened={opened} onClose={close} title="Add a session">
        <SessionForm academicYearId={academicYearId} onDone={close} />
      </Modal>
    </>
  );
}
