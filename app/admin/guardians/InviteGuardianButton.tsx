"use client";

import { Button, Checkbox, Group, Modal, Select, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconUserPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import type { GuardianGender, Relationship } from "@/lib/db/schema";
import { guardianGenderOptions, relationshipLabels, relationshipsFor } from "@/lib/demographics";
import { inviteGuardianFromOffice } from "./actions";

export type LinkableGuardian = {
  id: number;
  name: string;
  children: { id: number; firstName: string }[];
};

// Invite someone new from the Families page. Optionally as a co-guardian of a registered
// guardian's children — pick the guardian and all their children are ticked.
export function InviteGuardianButton({ guardians }: { guardians: LinkableGuardian[] }) {
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<{
    name: string;
    email: string;
    phone: string;
    gender: GuardianGender | null;
    withGuardianId: string | null;
    relationship: Relationship | null;
    studentIds: string[];
  }>({
    // The server's "check the highlighted fields" goes as soon as something changes.
    onValuesChange: () => setError(null),
    initialValues: {
      name: "",
      email: "",
      phone: "",
      gender: null,
      withGuardianId: null,
      relationship: null,
      studentIds: [],
    },
  });
  const linked = guardians.find((g) => String(g.id) === form.values.withGuardianId) ?? null;
  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = await inviteGuardianFromOffice({
      name: values.name,
      email: values.email,
      phone: values.phone || null,
      gender: values.gender,
      withGuardianId: values.withGuardianId ? Number(values.withGuardianId) : null,
      relationship: values.relationship,
      studentIds: values.withGuardianId ? values.studentIds.map(Number) : [],
    });
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(`We've emailed ${result.data.name} a link to set up their account`);
    form.reset();
    close();
    router.refresh();
  });
  return (
    <>
      <Button variant="light" leftSection={<IconUserPlus size={16} stroke={1.75} />} onClick={open}>
        Invite a guardian
      </Button>
      <Modal opened={opened} onClose={close} title="Invite a guardian" size="lg">
        <form onSubmit={submit}>
          <Stack gap="md">
            <Group grow align="flex-start">
              <TextInput label="Name" withAsterisk data-autofocus {...form.getInputProps("name")} />
              <TextInput label="Email" type="email" withAsterisk {...form.getInputProps("email")} />
            </Group>
            <Group grow align="flex-start">
              <TextInput label="Phone" type="tel" {...form.getInputProps("phone")} />
              <Select
                label="Gender"
                placeholder="Prefer not to say"
                data={guardianGenderOptions}
                clearable
                {...form.getInputProps("gender")}
              />
            </Group>
            <Select
              label="Link to a registered guardian's children"
              description="Leave empty and they register their own children after signing in"
              placeholder="Nobody — they'll register their children"
              searchable
              clearable
              data={guardians.map((g) => ({ value: String(g.id), label: g.name }))}
              value={form.values.withGuardianId}
              onChange={(v) => {
                form.setFieldValue("withGuardianId", v);
                const g = guardians.find((x) => String(x.id) === v);
                form.setFieldValue("studentIds", g ? g.children.map((c) => String(c.id)) : []);
              }}
            />
            {linked && (
              <>
                <Select
                  label="They are the children's"
                  placeholder="Choose"
                  data={relationshipsFor(form.values.gender).map((r) => ({
                    value: r,
                    label: relationshipLabels[r],
                  }))}
                  withAsterisk
                  allowDeselect={false}
                  {...form.getInputProps("relationship")}
                />
                <Checkbox.Group label="Which children" {...form.getInputProps("studentIds")}>
                  <Group gap="md" mt="xs">
                    {linked.children.map((c) => (
                      <Checkbox key={c.id} value={String(c.id)} label={c.firstName} />
                    ))}
                  </Group>
                </Checkbox.Group>
              </>
            )}
            <Text size="sm" c="dimmed">
              They&apos;ll get an email with a link to set a password. The link works for seven
              days.
            </Text>
            <FormError message={error} />
            <Group justify="flex-end">
              <Button type="submit" loading={saving}>
                Send invite
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
