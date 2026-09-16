"use client";

import { Button, Group, Menu, Modal, Stack, Table, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconDots, IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { StatusBadge } from "@/components/StatusBadge";
import { SubjectBadge } from "@/components/SubjectBadge";
import { toast } from "@/components/toast";
import { subjectIdFor } from "@/lib/academics";
import type { Subject } from "@/lib/db/queries/academics";
import { createSubject, renameSubject, setSubjectActive } from "./actions";

export function SubjectsTable({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState<Subject | null>(null);

  const toggle = async (subject: Subject) => {
    const result = await setSubjectActive({ id: subject.id, isActive: !subject.isActive });
    if (result.ok) {
      toast.success(
        subject.isActive ? `${subject.name} deactivated` : `${subject.name} reactivated`,
      );
      router.refresh();
    } else toast.error(result.error);
  };

  return (
    <>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Subject</Table.Th>
            <Table.Th>Code</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {subjects.map((subject) => (
            <Table.Tr key={subject.id}>
              <Table.Td>
                <SubjectBadge subjectId={subject.id} name={subject.name} size="md" />
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {subject.id}
                </Text>
              </Table.Td>
              <Table.Td>
                <StatusBadge
                  domain="application"
                  value={subject.isActive ? "active" : "inactive"}
                />
              </Table.Td>
              <Table.Td ta="end">
                <Menu shadow="md" position="bottom-end">
                  <Menu.Target>
                    <Button
                      variant="subtle"
                      color="gray"
                      size="xs"
                      aria-label={`Actions for ${subject.name}`}
                    >
                      <IconDots size={16} stroke={1.75} />
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={() => setRenaming(subject)}>Rename</Menu.Item>
                    <Menu.Item onClick={() => toggle(subject)}>
                      {subject.isActive ? "Deactivate" : "Reactivate"}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal opened={renaming !== null} onClose={() => setRenaming(null)} title="Rename subject">
        {renaming && <SubjectForm existing={renaming} onDone={() => setRenaming(null)} />}
      </Modal>
    </>
  );
}

export function AddSubjectButton() {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button leftSection={<IconPlus size={16} stroke={1.75} />} onClick={open}>
        Add subject
      </Button>
      <Modal opened={opened} onClose={close} title="Add a subject">
        <SubjectForm onDone={close} />
      </Modal>
    </>
  );
}

function SubjectForm({ existing, onDone }: { existing?: Subject; onDone: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm({ initialValues: { name: existing?.name ?? "" } });

  const submit = form.onSubmit(async ({ name }) => {
    setSaving(true);
    setError(null);
    const result = existing
      ? await renameSubject({ id: existing.id, name })
      : await createSubject({ name });
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(existing ? "Subject renamed" : `${name} added`);
    onDone();
    router.refresh();
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <TextInput
          label="Name"
          placeholder="Tajweed"
          withAsterisk
          data-autofocus
          {...form.getInputProps("name")}
        />
        {!existing && form.values.name && (
          <Text size="sm" c="dimmed">
            Code: {subjectIdFor(form.values.name) || "—"} (fixed once created)
          </Text>
        )}
        <FormError message={error} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {existing ? "Save name" : "Add subject"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
