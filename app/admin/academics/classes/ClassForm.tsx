"use client";

import { Button, Group, Modal, NumberInput, Select, Stack, Text, TextInput } from "@mantine/core";
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
  // What the class teacher teaches in this class, for the hand-over question.
  classTeacherSubjects: string[];
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
  // Values waiting on the hand-over answer when the class teacher changes.
  const [pending, setPending] = useState<ClassInput | null>(null);
  const form = useForm<ClassInput>({
    initialValues: {
      sessionId: existing?.sessionId ?? sessions[0]?.id,
      name: existing?.name ?? "",
      room: existing?.room ?? "",
      capacity: existing?.capacity ?? null,
      classTeacherId: existing?.classTeacherId ?? null,
    },
  });

  const teacherName = (id: ClassInput["classTeacherId"]) =>
    teachers.find((t) => String(t.id) === String(id))?.name ?? "the new class teacher";
  const teacherChanged = (values: ClassInput) =>
    !!existing &&
    existing.classTeacherId !== null &&
    values.classTeacherId !== null &&
    String(values.classTeacherId) !== String(existing.classTeacherId) &&
    existing.classTeacherSubjects.length > 0;

  const submit = form.onSubmit((values) => {
    if (teacherChanged(values)) setPending(values);
    else void save(values);
  });

  const save = async (values: ClassInput, handOverSubjects?: boolean) => {
    setPending(null);
    setSaving(true);
    setError(null);
    const result = existing
      ? await updateClass({ id: existing.id, ...values, handOverSubjects })
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
  };

  return (
    <form onSubmit={submit}>
      <Modal
        opened={pending !== null}
        onClose={() => setPending(null)}
        title="Hand over the subjects too?"
        size="lg"
      >
        {pending && existing && (
          <Stack gap="md">
            <Text size="sm">
              {teacherName(existing.classTeacherId)} teaches{" "}
              {existing.classTeacherSubjects.join(", ")} in this class. Give{" "}
              {existing.classTeacherSubjects.length === 1 ? "it" : "them"} to{" "}
              {teacherName(pending.classTeacherId)} as well?
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button variant="light" onClick={() => save(pending, false)}>
                Keep as they are
              </Button>
              <Button onClick={() => save(pending, true)}>
                Give {existing.classTeacherSubjects.length === 1 ? "it" : "them"} to{" "}
                {teacherName(pending.classTeacherId).split(" ")[0]}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
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
          description={
            existing
              ? "Takes the register and is the family's first contact"
              : "Takes the register and is the family's first contact; starts with every subject"
          }
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
