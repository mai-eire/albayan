"use client";

import { Button, Card, Select, Stack, Switch, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import type { SchoolSettings } from "@/lib/db/queries/settings";
import { updateSchoolSettings, type SettingsInput } from "./actions";

const timezones = Intl.supportedValuesOf("timeZone");

export function SettingsForm({ settings }: { settings: SchoolSettings }) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<SettingsInput>({
    initialValues: {
      name: settings.name,
      timezone: settings.timezone,
      studentIdPrefix: settings.studentIdPrefix,
      bankAccountName: settings.bankAccountName ?? "",
      bankIban: settings.bankIban ?? "",
      bankBic: settings.bankBic ?? "",
      absenceEmails: settings.absenceEmails,
    },
  });

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = await updateSchoolSettings(values);
    setSaving(false);
    if (result.ok) {
      toast.success("Settings saved");
      form.resetDirty(values);
      return;
    }
    if (result.fieldErrors) form.setErrors(result.fieldErrors);
    setError(result.error);
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Card>
          <Title order={3} mb="md">
            School
          </Title>
          <Stack gap="md">
            <TextInput label="School name" withAsterisk {...form.getInputProps("name")} />
            <Select
              label="Timezone"
              description="Used for today's date and lesson times"
              data={timezones}
              searchable
              allowDeselect={false}
              {...form.getInputProps("timezone")}
            />
            <TextInput
              label="Student ID prefix"
              description="Student IDs look like ALB-26-0042. Changing this only affects IDs issued from now on."
              maw={200}
              {...form.getInputProps("studentIdPrefix")}
            />
            <Switch
              label="Email guardians when a child is marked absent"
              {...form.getInputProps("absenceEmails", { type: "checkbox" })}
            />
          </Stack>
        </Card>
        <Card>
          <Title order={3} mb="xs">
            How to pay
          </Title>
          <Stack gap="md">
            <TextInput label="Account name" {...form.getInputProps("bankAccountName")} />
            <TextInput label="IBAN" {...form.getInputProps("bankIban")} />
            <TextInput label="BIC" maw={200} {...form.getInputProps("bankBic")} />
          </Stack>
        </Card>
        <FormError message={error} />
        <Button type="submit" loading={saving} style={{ alignSelf: "flex-start" }}>
          Save settings
        </Button>
      </Stack>
    </form>
  );
}
