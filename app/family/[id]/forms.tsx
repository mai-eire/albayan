"use client";

import { Checkbox, Group, Select, Stack, TagsInput, Textarea, TextInput } from "@mantine/core";
import { DateField } from "@/components/DateField";
import { SaveRow, useSave } from "@/components/EditableCard";
import type { StudentForGuardian } from "@/lib/db/queries/family";
import { commonAllergies, splitAllergies, yearGroupSections } from "@/lib/demographics";
import { updateChildDetails, updateChildHealth } from "./actions";

export function ChildDetailsForm({ child }: { child: StudentForGuardian }) {
  const { form, submit, error, saving, close } = useSave(
    {
      firstName: child.firstName,
      lastName: child.lastName,
      dateOfBirth: child.dateOfBirth,
      gender: child.gender,
      schoolYearGroup: child.schoolYearGroup,
      isHomeschooled: child.isHomeschooled,
    },
    (values) => updateChildDetails({ id: child.id, ...values }),
    "Details saved",
  );
  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Group grow align="flex-start">
          <TextInput label="First name" withAsterisk {...form.getInputProps("firstName")} />
          <TextInput label="Surname" withAsterisk {...form.getInputProps("lastName")} />
        </Group>
        <Group grow align="flex-start">
          <DateField label="Date of birth" withAsterisk {...form.getInputProps("dateOfBirth")} />
          <Select
            label="Gender"
            data={[
              { value: "male", label: "Boy" },
              { value: "female", label: "Girl" },
            ]}
            allowDeselect={false}
            {...form.getInputProps("gender")}
          />
        </Group>
        <Stack gap="xs">
          <Select
            label="School year"
            description="The year they are in, or would be"
            data={yearGroupSections}
            searchable
            clearable
            withAsterisk={!form.values.isHomeschooled}
            {...form.getInputProps("schoolYearGroup")}
          />
          <Checkbox
            label="Home schooled"
            checked={form.values.isHomeschooled}
            onChange={(e) => form.setFieldValue("isHomeschooled", e.currentTarget.checked)}
          />
        </Stack>
        <SaveRow saving={saving} dirty={form.isDirty()} error={error} close={close} />
      </Stack>
    </form>
  );
}

export function ChildHealthForm({ child }: { child: StudentForGuardian }) {
  const { form, submit, error, saving, close } = useSave(
    { allergies: splitAllergies(child.allergies), medicalNotes: child.medicalNotes ?? "" },
    (values) => updateChildHealth({ id: child.id, ...values }),
    "Health notes saved",
  );
  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <TagsInput
          label="Allergies"
          description="Their teachers see this. Pick from the list or type your own."
          data={commonAllergies}
          maxTags={10}
          {...form.getInputProps("allergies")}
        />
        <Textarea
          label="Medical needs"
          description="Their teachers see this"
          autosize
          minRows={2}
          {...form.getInputProps("medicalNotes")}
        />
        <SaveRow saving={saving} dirty={form.isDirty()} error={error} close={close} />
      </Stack>
    </form>
  );
}
