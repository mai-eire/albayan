"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CardTitle } from "@/components/CardTitle";
import { confirmDestructive } from "@/components/confirm";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import type { Note } from "@/lib/db/queries/notes";
import {
  noteCategories,
  noteVisibilities,
  type NoteCategory,
  type NoteVisibility,
} from "@/lib/db/schema";
import { addNote, deleteNote } from "@/lib/notes";

export const categoryLabels: Record<NoteCategory, string> = {
  general: "General",
  praise: "Praise",
  concern: "Concern",
  behaviour: "Behaviour",
};

const categoryColors: Record<NoteCategory, string> = {
  general: "gray",
  praise: "tile",
  concern: "saffron",
  behaviour: "clay",
};

export const visibilityLabels: Record<NoteVisibility, string> = {
  staff: "Staff only",
  guardians: "Family",
  guardians_and_student: "Family and student",
};

// Notes on a student for staff: the list with who wrote each and who can see it, and a
// short form to add one. Family and student pages render notes read-only (§5).
export function NotesCard({
  studentId,
  firstName,
  notes,
  currentUserId,
  isAdmin,
}: {
  studentId: number;
  firstName: string;
  notes: Note[];
  currentUserId: number;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm({
    initialValues: {
      body: "",
      category: "general" as NoteCategory,
      visibility: "staff" as NoteVisibility,
    },
  });

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = await addNote({ studentId, ...values });
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(values.visibility === "staff" ? "Note added" : "Note added and the family told");
    form.reset();
    router.refresh();
  });

  const remove = (note: Note) =>
    confirmDestructive({
      title: "Remove this note?",
      message: "It disappears for everyone who could see it. This cannot be undone.",
      confirmLabel: "Remove note",
      onConfirm: async () => {
        const result = await deleteNote({ id: note.id });
        if (result.ok) {
          toast.success("Note removed");
          router.refresh();
        } else toast.error(result.error);
      },
    });

  return (
    <Card>
      <CardTitle>Notes</CardTitle>
      <form onSubmit={submit}>
        <Stack gap="sm" mb="lg">
          <Textarea
            aria-label="New note"
            placeholder={`Something about ${firstName} worth remembering`}
            autosize
            minRows={2}
            {...form.getInputProps("body")}
          />
          <Group gap="sm" align="flex-end" wrap="wrap">
            <Select
              aria-label="Category"
              data={noteCategories.map((c) => ({ value: c, label: categoryLabels[c] }))}
              allowDeselect={false}
              w={140}
              {...form.getInputProps("category")}
            />
            <Select
              aria-label="Who can see it"
              data={noteVisibilities.map((v) => ({ value: v, label: visibilityLabels[v] }))}
              allowDeselect={false}
              w={180}
              {...form.getInputProps("visibility")}
            />
            <Button type="submit" loading={saving} disabled={!form.values.body.trim()}>
              Add note
            </Button>
          </Group>
          <FormError message={error} />
        </Stack>
      </form>
      {notes.length === 0 ? (
        <Text size="sm" c="dimmed">
          No notes yet.
        </Text>
      ) : (
        <Stack gap="md">
          {notes.map((note) => (
            <div key={note.id}>
              <Group gap="xs" justify="space-between" wrap="nowrap">
                <Group gap="xs">
                  <Badge variant="light" color={categoryColors[note.category]}>
                    {categoryLabels[note.category]}
                  </Badge>
                  <Text size="sm" c="dimmed">
                    {note.authorName} · {dayjs(note.createdAt).format("D MMM YYYY")} ·{" "}
                    {visibilityLabels[note.visibility]}
                  </Text>
                </Group>
                {(isAdmin || note.authorUserId === currentUserId) && (
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="Remove note"
                    onClick={() => remove(note)}
                  >
                    <IconTrash size={16} stroke={1.75} />
                  </ActionIcon>
                )}
              </Group>
              <Text size="sm" mt={4} style={{ whiteSpace: "pre-wrap" }}>
                {note.body}
              </Text>
            </div>
          ))}
        </Stack>
      )}
    </Card>
  );
}
