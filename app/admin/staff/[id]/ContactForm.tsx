"use client";

import { Group, Stack, TextInput } from "@mantine/core";
import { SaveRow, useSave } from "@/components/EditableCard";
import { updateStaffContact } from "../actions";

export function StaffContactForm({
  person,
}: {
  person: { id: number; name: string; email: string; phone: string | null };
}) {
  const { form, submit, error, saving, close } = useSave(
    { name: person.name, phone: person.phone ?? "" },
    (values) => updateStaffContact({ userId: person.id, ...values }),
    "Details saved",
  );
  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Group grow align="flex-start">
          <TextInput label="Name" withAsterisk {...form.getInputProps("name")} />
          <TextInput label="Phone" type="tel" {...form.getInputProps("phone")} />
        </Group>
        <TextInput
          label="Email"
          value={person.email}
          readOnly
          description="Their sign-in; they change it from their own account"
        />
        <SaveRow saving={saving} dirty={form.isDirty()} error={error} close={close} />
      </Stack>
    </form>
  );
}
