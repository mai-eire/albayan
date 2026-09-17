"use client";

import { Button, Group, Modal, Select, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconUserPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/DateField";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import type { Gender, GuardianGender, Relationship } from "@/lib/db/schema";
import { relationshipLabels, relationshipsFor } from "@/lib/demographics";
import { addChildForGuardian } from "./actions";

type Props = {
  guardian: { id: number; name: string; gender: GuardianGender | null };
  sessions: { id: number; name: string }[];
};

// The office registers a child on the family's behalf: the basics now, approve from the
// inbox, the rest of the profile later.
export function AddChildButton({ guardian, sessions }: Props) {
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const relationshipOptions = relationshipsFor(guardian.gender);
  const form = useForm({
    initialValues: {
      firstName: "",
      lastName: guardian.name.split(" ").slice(-1)[0] ?? "",
      gender: null as Gender | null,
      dateOfBirth: null as string | null,
      relationship: (guardian.gender === "female"
        ? "mother"
        : guardian.gender === "male"
          ? "father"
          : null) as Relationship | null,
      preferredSessionId: sessions[0] ? String(sessions[0].id) : null,
    },
  });
  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = await addChildForGuardian({
      guardianId: guardian.id,
      firstName: values.firstName,
      lastName: values.lastName,
      gender: values.gender as Gender,
      dateOfBirth: values.dateOfBirth ?? "",
      relationship: values.relationship as Relationship,
      preferredSessionId: Number(values.preferredSessionId),
    });
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(`${values.firstName} added — approve them from Applications`);
    close();
    router.push("/admin/applications");
  });
  if (sessions.length === 0) return null;
  return (
    <>
      <Button variant="light" leftSection={<IconUserPlus size={16} stroke={1.75} />} onClick={open}>
        Add a child
      </Button>
      <Modal opened={opened} onClose={close} title={`Add a child for ${guardian.name}`}>
        <form onSubmit={submit}>
          <Stack gap="md">
            <Group grow align="flex-start">
              <TextInput
                label="First name"
                withAsterisk
                data-autofocus
                {...form.getInputProps("firstName")}
              />
              <TextInput label="Surname" withAsterisk {...form.getInputProps("lastName")} />
            </Group>
            <Group grow align="flex-start">
              <DateField
                label="Date of birth"
                withAsterisk
                maxDate={new Date()}
                {...form.getInputProps("dateOfBirth")}
              />
              <Select
                label="Gender"
                data={[
                  { value: "male", label: "Boy" },
                  { value: "female", label: "Girl" },
                ]}
                withAsterisk
                allowDeselect={false}
                {...form.getInputProps("gender")}
              />
            </Group>
            <Group grow align="flex-start">
              <Select
                label={`${guardian.name} is the child's`}
                data={relationshipOptions.map((r) => ({ value: r, label: relationshipLabels[r] }))}
                withAsterisk
                allowDeselect={false}
                {...form.getInputProps("relationship")}
              />
              <Select
                label="Preferred session"
                data={sessions.map((s) => ({ value: String(s.id), label: s.name }))}
                withAsterisk
                allowDeselect={false}
                {...form.getInputProps("preferredSessionId")}
              />
            </Group>
            <Text size="sm" c="dimmed">
              This creates an application in the family&apos;s name. Approve it from Applications to
              give the child a class and a fee; medical and other details go on their profile.
            </Text>
            <FormError message={error} />
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Add child
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
