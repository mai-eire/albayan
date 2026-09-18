"use client";

import {
  Button,
  Checkbox,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconUserPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AddParentForm } from "@/app/family/parents/AddParentForm";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import type { Relationship } from "@/lib/db/schema";
import { relationshipLabels, relationshipsFor } from "@/lib/demographics";
import { addGuardianToStudent, linkExistingGuardian } from "./[id]/actions";

export type GuardianOption = { id: number; name: string; email: string; phone: string | null };

type Props = {
  // The children to link; all ticked to start with.
  kids: { id: number; firstName: string }[];
  // Everyone registered, minus the children's existing guardians.
  guardians: GuardianOption[];
  label: string;
  title: string;
};

// The office adds a guardian to children: first look for someone already registered (the
// other parent usually is), otherwise invite someone new. Never a duplicate account.
export function AddGuardianButton({ kids, guardians, label, title }: Props) {
  const [opened, { open, close }] = useDisclosure(false);
  const [mode, setMode] = useState<"existing" | "new">(guardians.length ? "existing" : "new");
  return (
    <>
      <Button variant="light" leftSection={<IconUserPlus size={16} stroke={1.75} />} onClick={open}>
        {label}
      </Button>
      <Modal opened={opened} onClose={close} title={title} size="lg">
        <Stack gap="md">
          {guardians.length > 0 && (
            <SegmentedControl
              fullWidth
              value={mode}
              onChange={(v) => setMode(v as "existing" | "new")}
              data={[
                { value: "existing", label: "Already registered" },
                { value: "new", label: "Someone new" },
              ]}
            />
          )}
          {mode === "existing" ? (
            <LinkExistingForm kids={kids} guardians={guardians} onDone={close} />
          ) : (
            <AddParentForm kids={kids} submit={addGuardianToStudent} onDone={close} />
          )}
        </Stack>
      </Modal>
    </>
  );
}

function LinkExistingForm({
  kids,
  guardians,
  onDone,
}: {
  kids: { id: number; firstName: string }[];
  guardians: GuardianOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<{
    guardianId: string | null;
    relationship: Relationship | null;
    studentIds: string[];
  }>({
    // The server's "check the highlighted fields" goes as soon as something changes.
    onValuesChange: () => setError(null),
    initialValues: {
      guardianId: null,
      relationship: null,
      studentIds: kids.map((k) => String(k.id)),
    },
  });
  const chosen = guardians.find((g) => String(g.id) === form.values.guardianId);
  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = await linkExistingGuardian({
      guardianId: Number(values.guardianId),
      relationship: values.relationship as Relationship,
      studentIds: values.studentIds.map(Number),
    });
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(`${result.data.name} can now see the children too`);
    onDone();
    router.refresh();
  });
  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Select
          label="Who"
          placeholder="Search by name, email or phone"
          searchable
          data-autofocus
          nothingFoundMessage="Nobody registered matches — add them as someone new"
          data={guardians.map((g) => ({ value: String(g.id), label: g.name }))}
          filter={({ options, search }) => {
            const q = search.trim().toLowerCase();
            return options.filter((o) => {
              if (!("value" in o)) return false;
              const g = guardians.find((x) => String(x.id) === o.value);
              return (
                !!g &&
                (g.name.toLowerCase().includes(q) ||
                  g.email.toLowerCase().includes(q) ||
                  (g.phone ?? "").replace(/\s/g, "").includes(q.replace(/\s/g, "")))
              );
            });
          }}
          withAsterisk
          {...form.getInputProps("guardianId")}
        />
        {chosen && (
          <Text size="sm" c="dimmed">
            {chosen.email}
            {chosen.phone && ` · ${chosen.phone}`}
          </Text>
        )}
        <Select
          label={kids.length === 1 ? `They are ${kids[0].firstName}'s` : "They are the children's"}
          placeholder="Choose"
          data={relationshipsFor(null).map((r) => ({ value: r, label: relationshipLabels[r] }))}
          withAsterisk
          allowDeselect={false}
          {...form.getInputProps("relationship")}
        />
        {kids.length > 1 && (
          <Checkbox.Group label="Which children" withAsterisk {...form.getInputProps("studentIds")}>
            <Group gap="md" mt="xs">
              {kids.map((k) => (
                <Checkbox key={k.id} value={String(k.id)} label={k.firstName} />
              ))}
            </Group>
          </Checkbox.Group>
        )}
        <Text size="sm" c="dimmed">
          They&apos;ll see the children in their family area straight away and get a notification.
        </Text>
        <FormError message={error} />
        <Group justify="flex-end">
          <Button type="submit" loading={saving} disabled={!form.values.guardianId}>
            Link guardian
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
