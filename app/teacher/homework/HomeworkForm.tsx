"use client";

import {
  ActionIcon,
  Button,
  Collapse,
  FileInput,
  Group,
  List,
  ListItem,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconFile,
  IconLink,
  IconPaperclip,
  IconPlus,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/DateField";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import { uploadFile, type UploadedFile } from "@/components/uploadFile";
import type { HomeworkRow, HomeworkTarget } from "@/lib/db/queries/homework";
import { createResource, deleteResource } from "@/lib/resources";
import { nextDateOn } from "@/lib/time";
import { saveHomework, setHomeworkPublished } from "./actions";

export type Attachment = { id: number; title: string; kind: "file" | "link" };

type Values = {
  classId: number | null;
  subjectId: string | null;
  title: string;
  description: string;
  dueDate: string | null;
  attachKind: "file" | "link";
  attachTitle: string;
  file: File | null;
  url: string;
};

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// One form for new and existing homework: what it is, when it's due, and — folded away
// until wanted — a file or link to go with it. Save as draft or publish; published
// homework is saved as it is (unpublishing is on the list's menu).
export function HomeworkForm({
  targets,
  existing,
  attachments = [],
  today,
  onDone,
}: {
  // On a class page these are that class's subjects only, so the class picker is skipped.
  targets: HomeworkTarget[];
  existing?: HomeworkRow;
  attachments?: Attachment[];
  today: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "publish" | "save" | null>(null);
  const [attached, setAttached] = useState(attachments);
  const [attachOpen, { toggle: toggleAttach }] = useDisclosure(false);
  const form = useForm<Values>({
    onValuesChange: () => setError(null),
    initialValues: {
      classId: existing?.classId ?? targets[0]?.classId ?? null,
      subjectId: existing?.subjectId ?? targets[0]?.subjectId ?? null,
      title: existing?.title ?? "",
      description: existing?.description ?? "",
      dueDate: existing?.dueDate ?? null,
      attachKind: "file",
      attachTitle: "",
      file: null,
      url: "",
    },
  });
  const classOptions = targets.filter(
    (t, i) => targets.findIndex((u) => u.classId === t.classId) === i,
  );
  const oneClass = classOptions.length === 1;
  const subjectOptions = targets.filter((t) => t.classId === form.values.classId);
  const lessonDay = targets.find((t) => t.classId === form.values.classId)?.dayOfWeek ?? null;
  // The class's next lesson after today.
  const nextLesson = lessonDay === null ? null : nextDateOn(lessonDay, addDays(today, 1));
  const published = Boolean(existing?.publishedAt);
  const attachFilled =
    form.values.attachKind === "file" ? form.values.file !== null : !!form.values.url.trim();

  const submit = async (what: "draft" | "publish" | "save") => {
    if (saving) return;
    setSaving(what);
    setError(null);
    const values = form.values;
    // The file goes up first, so nothing is saved if the upload fails.
    let file: UploadedFile | null = null;
    if (attachFilled && values.attachKind === "file" && values.file) {
      const uploaded = await uploadFile(values.file);
      if (!uploaded.ok) {
        setError(uploaded.error);
        setSaving(null);
        return;
      }
      file = uploaded.file;
    }
    // Saved in its current state, then the attachment, then published if asked — so a
    // draft's attachment is never announced on its own.
    const saved = await saveHomework({
      id: existing?.id,
      classId: values.classId,
      subjectId: values.subjectId,
      title: values.title,
      description: values.description,
      dueDate: values.dueDate,
      publish: published,
    });
    if (!saved.ok) {
      if (saved.fieldErrors) form.setErrors(saved.fieldErrors);
      setError(saved.error);
      setSaving(null);
      return;
    }
    const id = saved.data.id;
    if (attachFilled) {
      const title = values.attachTitle.trim() || values.file?.name || values.url.trim();
      const result = await createResource({
        title,
        description: "",
        audience: "students_and_guardians",
        target: { kind: "homework", homeworkId: id },
        file,
        url: values.attachKind === "link" ? values.url : null,
      });
      if (!result.ok) {
        setError(`Saved, but the attachment didn't go on: ${result.error}`);
        setSaving(null);
        router.refresh();
        return;
      }
    }
    if (what === "publish" && !published) {
      const result = await setHomeworkPublished({ id, published: true });
      if (!result.ok) {
        setError(`Saved as a draft, but not published: ${result.error}`);
        setSaving(null);
        router.refresh();
        return;
      }
    }
    setSaving(null);
    toast.success(
      what === "publish" ? "Homework published" : existing ? "Homework saved" : "Draft saved",
    );
    router.refresh();
    onDone();
  };

  const remove = async (a: Attachment) => {
    const result = await deleteResource({ id: a.id });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setAttached((list) => list.filter((x) => x.id !== a.id));
    router.refresh();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(published ? "save" : "publish");
      }}
    >
      <Stack gap="md">
        <Group grow>
          {!oneClass && (
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
          )}
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
        <Group align="flex-end" gap="xs">
          <DateField
            label="Due"
            withAsterisk
            minDate={new Date()}
            maw={240}
            {...form.getInputProps("dueDate")}
          />
          {nextLesson && (
            <Button
              variant={form.values.dueDate === nextLesson ? "light" : "default"}
              size="sm"
              onClick={() => form.setFieldValue("dueDate", nextLesson)}
            >
              Next lesson
            </Button>
          )}
        </Group>

        {attached.length > 0 && (
          <List spacing={4} size="sm" aria-label="Attached">
            {attached.map((a) => (
              <ListItem
                key={a.id}
                icon={
                  a.kind === "link" ? (
                    <IconLink size={14} stroke={1.75} />
                  ) : (
                    <IconFile size={14} stroke={1.75} />
                  )
                }
              >
                <Group gap={4} wrap="nowrap">
                  <Text size="sm" component="span">
                    {a.title}
                  </Text>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    aria-label={`Remove ${a.title}`}
                    onClick={() => remove(a)}
                  >
                    <IconX size={14} stroke={1.75} />
                  </ActionIcon>
                </Group>
              </ListItem>
            ))}
          </List>
        )}
        <UnstyledButton onClick={toggleAttach} aria-expanded={attachOpen} fz="sm" fw={500}>
          <Group gap={4}>
            <IconPaperclip size={14} stroke={1.75} />
            Attach a file or link
            <IconChevronDown
              size={14}
              stroke={1.75}
              style={{ transform: attachOpen ? "rotate(180deg)" : undefined }}
            />
          </Group>
        </UnstyledButton>
        <Collapse expanded={attachOpen}>
          <Stack gap="sm">
            <SegmentedControl
              data={[
                { value: "file", label: "File" },
                { value: "link", label: "Link" },
              ]}
              {...form.getInputProps("attachKind")}
            />
            {form.values.attachKind === "file" ? (
              <FileInput
                label="File"
                description="Up to 25 MB"
                leftSection={<IconUpload size={16} stroke={1.75} />}
                clearable
                {...form.getInputProps("file")}
              />
            ) : (
              <TextInput
                label="Link"
                placeholder="https://"
                type="url"
                {...form.getInputProps("url")}
              />
            )}
            <TextInput
              label="Attachment title"
              description={
                form.values.attachKind === "file"
                  ? "Leave blank to use the file name"
                  : "Leave blank to use the link"
              }
              {...form.getInputProps("attachTitle")}
            />
          </Stack>
        </Collapse>

        <FormError message={error} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            Cancel
          </Button>
          {published ? (
            <Button type="submit" loading={saving === "save"}>
              Save changes
            </Button>
          ) : (
            <>
              <Button variant="light" loading={saving === "draft"} onClick={() => submit("draft")}>
                Save as draft
              </Button>
              <Button type="submit" loading={saving === "publish"}>
                Publish
              </Button>
            </>
          )}
        </Group>
      </Stack>
    </form>
  );
}

export function AddHomeworkButton({
  targets,
  today,
}: {
  targets: HomeworkTarget[];
  today: string;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button leftSection={<IconPlus size={16} stroke={1.75} />} onClick={open}>
        Add homework
      </Button>
      <Modal opened={opened} onClose={close} title="Add homework" size="lg">
        {opened && <HomeworkForm targets={targets} today={today} onDone={close} />}
      </Modal>
    </>
  );
}
