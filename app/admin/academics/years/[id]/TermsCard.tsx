"use client";

import {
  ActionIcon,
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CardTitle } from "@/components/CardTitle";
import { DateField } from "@/components/DateField";
import { confirmDestructive } from "@/components/confirm";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import type { Term } from "@/lib/db/queries/academics";
import { createTerm, deleteTerm, updateTerm, type TermInput } from "../actions";

export function TermsCard({ yearId, terms }: { yearId: string; terms: Term[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Term | "new" | null>(null);

  const remove = (term: Term) =>
    confirmDestructive({
      title: "Delete this term?",
      message: `This removes ${term.name} (${term.startDate} to ${term.endDate}). This cannot be undone.`,
      confirmLabel: "Delete term",
      onConfirm: async () => {
        const result = await deleteTerm({ id: term.id });
        if (result.ok) {
          toast.success("Term deleted");
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
            Add term
          </Button>
        }
      >
        Terms
      </CardTitle>
      {terms.length === 0 ? (
        <Text c="dimmed" size="sm">
          No terms yet. Most schools have three.
        </Text>
      ) : (
        <Table>
          <Table.Tbody>
            {terms.map((term) => (
              <Table.Tr key={term.id}>
                <Table.Td fw={500}>{term.name}</Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {term.startDate} – {term.endDate}
                  </Text>
                </Table.Td>
                <Table.Td ta="end">
                  <Group gap="xs" justify="flex-end" wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label={`Edit ${term.name}`}
                      onClick={() => setEditing(term)}
                    >
                      <IconPencil size={16} stroke={1.75} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="clay"
                      aria-label={`Delete ${term.name}`}
                      onClick={() => remove(term)}
                    >
                      <IconTrash size={16} stroke={1.75} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      <Modal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add a term" : "Edit term"}
      >
        {editing && (
          <TermForm
            yearId={yearId}
            existing={editing === "new" ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </Card>
  );
}

function TermForm({
  yearId,
  existing,
  onDone,
}: {
  yearId: string;
  existing?: Term;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<TermInput>({
    initialValues: {
      academicYearId: yearId,
      name: existing?.name ?? "",
      startDate: existing?.startDate ?? "",
      endDate: existing?.endDate ?? "",
    },
  });

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = existing
      ? await updateTerm({ id: existing.id, ...values })
      : await createTerm(values);
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(existing ? "Term saved" : "Term added");
    onDone();
    router.refresh();
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <TextInput
          label="Name"
          placeholder="Autumn term"
          withAsterisk
          {...form.getInputProps("name")}
        />
        <Group grow>
          <DateField label="First day" withAsterisk {...form.getInputProps("startDate")} />
          <DateField label="Last day" withAsterisk {...form.getInputProps("endDate")} />
        </Group>
        <FormError message={error} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {existing ? "Save term" : "Add term"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
