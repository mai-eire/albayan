"use client";

import { Button, Group, Modal, NumberInput, Select, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import type { TeacherOption } from "@/lib/db/queries/academics";
import { createClass, updateClass, type ClassInput } from "./actions";

type SessionOption = { id: number; name: string };
type Existing = {
  id: number;
  sessionId: number;
  name: string;
  room: string | null;
  capacity: number | null;
  classTeacherId: number | null;
};
type Props = {
  sessions: SessionOption[];
  teachers: TeacherOption[];
  existing?: Existing;
  onDone?: () => void;
};

export function ClassForm({ sessions, teachers, existing, onDone }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<ClassInput>({
    initialValues: {
      sessionId: existing?.sessionId ?? sessions[0]?.id,
      name: existing?.name ?? "",
      room: existing?.room ?? "",
      capacity: existing?.capacity ?? null,
      classTeacherId: existing?.classTeacherId ?? null,
    },
  });

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = existing
      ? await updateClass({ id: existing.id, ...values })
      : await createClass(values);
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(existing ? "Class saved" : `${values.name} added`);
    form.resetDirty(values);
    onDone?.();
    const created = result.data;
    if (!existing && created) router.push(`/admin/academics/classes/${created.id}`);
    else router.refresh();
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Group grow>
          <TextInput
            label="Name"
            placeholder="Level 2"
            withAsterisk
            data-autofocus
            {...form.getInputProps("name")}
          />
          <Select
            label="Session"
            data={sessions.map((s) => ({ value: String(s.id), label: s.name }))}
            allowDeselect={false}
            value={String(form.values.sessionId)}
            onChange={(v) => form.setFieldValue("sessionId", Number(v))}
            error={form.errors.sessionId}
          />
        </Group>
        <Select
          label="Class teacher"
          description="Takes the register and is the family's first contact"
          data={teachers
            .filter((t) => t.isActive || t.id === existing?.classTeacherId)
            .map((t) => ({ value: String(t.id), label: t.name }))}
          clearable
          searchable
          value={form.values.classTeacherId ? String(form.values.classTeacherId) : null}
          onChange={(v) => form.setFieldValue("classTeacherId", v ? Number(v) : null)}
        />
        <Group grow>
          <TextInput label="Room" {...form.getInputProps("room")} />
          <NumberInput label="Capacity" min={1} max={200} {...form.getInputProps("capacity")} />
        </Group>
        <FormError message={error} />
        <Group justify="flex-end">
          {onDone && (
            <Button variant="default" onClick={onDone}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={saving}>
            {existing ? "Save class" : "Add class"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function AddClassButton({
  sessions,
  teachers,
}: {
  sessions: SessionOption[];
  teachers: TeacherOption[];
}) {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button leftSection={<IconPlus size={16} stroke={1.75} />} onClick={open}>
        Add class
      </Button>
      <Modal opened={opened} onClose={close} title="Add a class">
        <ClassForm sessions={sessions} teachers={teachers} onDone={close} />
      </Modal>
    </>
  );
}
