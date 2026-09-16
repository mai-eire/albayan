"use client";

import { Button, Group, Modal, Select, Stack, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/DateField";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import type { HomeworkRow, HomeworkTarget } from "@/lib/db/queries/homework";
import { saveHomework } from "./actions";

type Values = {
  classId: number | null;
  subjectId: string | null;
  title: string;
  description: string;
  dueDate: string | null;
};

export function HomeworkForm({
  targets,
  existing,
  onDone,
}: {
  targets: HomeworkTarget[];
  existing?: HomeworkRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const form = useForm<Values>({
    initialValues: {
      classId: existing?.classId ?? targets[0]?.classId ?? null,
      subjectId: existing?.subjectId ?? targets[0]?.subjectId ?? null,
      title: existing?.title ?? "",
      description: existing?.description ?? "",
      dueDate: existing?.dueDate ?? null,
    },
  });
  const classOptions = targets.filter(
    (t, i) => targets.findIndex((u) => u.classId === t.classId) === i,
  );
  const subjectOptions = targets.filter((t) => t.classId === form.values.classId);

  const submit = async (publish: boolean) => {
    setSaving(publish ? "publish" : "draft");
    setError(null);
    const result = await saveHomework({ id: existing?.id, ...form.values, publish });
    setSaving(null);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(
      publish && !existing?.publishedAt
        ? "Homework published"
        : existing
          ? "Homework saved"
          : "Draft saved",
    );
    onDone();
    router.refresh();
  };

  const published = Boolean(existing?.publishedAt);

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <Stack gap="md">
        <Group grow>
          <Select
            label="Class"
            data={classOptions.map((t) => ({
              value: String(t.classId),
              label: `${t.className} · ${t.sessionName}`,
            }))}
            allowDeselect={false}
            value={form.values.classId?.toString() ?? null}
            onChange={(v) => {
              const classId = v ? Number(v) : null;
              form.setFieldValue("classId", classId);
              form.setFieldValue(
                "subjectId",
                targets.find((t) => t.classId === classId)?.subjectId ?? null,
              );
            }}
            error={form.errors.classId}
            disabled={published}
          />
          <Select
            label="Subject"
            data={subjectOptions.map((t) => ({ value: t.subjectId, label: t.subjectName }))}
            allowDeselect={false}
            {...form.getInputProps("subjectId")}
            disabled={published}
          />
        </Group>
        <TextInput
          label="Title"
          placeholder="Surah Al-Fil, verses 1–5"
          withAsterisk
          data-autofocus
          {...form.getInputProps("title")}
        />
        <Textarea
          label="What to do"
          placeholder="Memorise verses 1–5 and practise the letters on page 12."
          autosize
          minRows={3}
          {...form.getInputProps("description")}
        />
        <DateField
          label="Due"
          withAsterisk
          minDate={new Date()}
          maw={240}
          {...form.getInputProps("dueDate")}
        />
        <FormError message={error} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            Cancel
          </Button>
          {!published && (
            <Button variant="light" loading={saving === "draft"} onClick={() => submit(false)}>
              Save draft
            </Button>
          )}
          <Button loading={saving === "publish"} onClick={() => submit(true)}>
            {published ? "Save changes" : "Publish"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function AddHomeworkButton({ targets }: { targets: HomeworkTarget[] }) {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button leftSection={<IconPlus size={16} stroke={1.75} />} onClick={open}>
        Add homework
      </Button>
      <Modal opened={opened} onClose={close} title="Add homework" size="lg">
        <HomeworkForm targets={targets} onDone={close} />
      </Modal>
    </>
  );
}
