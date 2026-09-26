"use client";

import { Checkbox, Group, Select, Stack, Textarea, TextInput } from "@mantine/core";
import { DateField } from "@/components/DateField";
import { SaveRow, useSave } from "@/components/EditableCard";
import type { StudentForAdmin } from "@/lib/db/queries/students";
import { arabicProficiencies } from "@/lib/db/schema";
import { preferNotToSay, proficiencyLabels, yearGroupSections } from "@/lib/demographics";
import { countryOptions } from "@/lib/countries";
import { updateStudentDetails, updateStudentCountry, updateStudentHealth } from "./actions";

export function DetailsForm({ student }: { student: StudentForAdmin }) {
  const { form, submit, error, saving, close } = useSave(
    {
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      schoolYearGroup: student.schoolYearGroup,
      isHomeschooled: student.isHomeschooled,
      arabicProficiency: student.arabicProficiency,
      email: student.email ?? "",
      phone: student.phone ?? "",
    },
    (values) => updateStudentDetails({ id: student.id, ...values }),
    "Details saved",
  );
  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Group grow>
          <TextInput label="First name" withAsterisk {...form.getInputProps("firstName")} />
          <TextInput label="Surname" withAsterisk {...form.getInputProps("lastName")} />
        </Group>
        <Group grow>
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
        <Group grow align="flex-start">
          <Stack gap="xs">
            <Select
              label="School year"
              data={yearGroupSections}
              searchable
              clearable
              {...form.getInputProps("schoolYearGroup")}
            />
            <Checkbox
              label="Home schooled"
              checked={form.values.isHomeschooled}
              onChange={(e) => {
                form.setFieldValue("isHomeschooled", e.currentTarget.checked);
              }}
            />
          </Stack>
          <Select
            label="Arabic level"
            data={arabicProficiencies.map((p) => ({ value: p, label: proficiencyLabels[p] }))}
            allowDeselect={false}
            {...form.getInputProps("arabicProficiency")}
          />
        </Group>
        <Group grow align="flex-start">
          <TextInput
            label="Student's email"
            description="Optional; lets them reset their own password"
            type="email"
            {...form.getInputProps("email")}
          />
          <TextInput label="Student's phone" type="tel" {...form.getInputProps("phone")} />
        </Group>
        <SaveRow saving={saving} dirty={form.isDirty()} error={error} close={close} />
      </Stack>
    </form>
  );
}

export function HealthForm({ student }: { student: StudentForAdmin }) {
  const { form, submit, error, saving, close } = useSave(
    { allergies: student.allergies ?? "", medicalNotes: student.medicalNotes ?? "" },
    (values) => updateStudentHealth({ id: student.id, ...values }),
    "Health notes saved",
  );
  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Textarea
          label="Allergies"
          description="Shown to their teachers"
          autosize
          minRows={2}
          {...form.getInputProps("allergies")}
        />
        <Textarea
          label="Medical needs"
          description="Shown to their teachers"
          autosize
          minRows={2}
          {...form.getInputProps("medicalNotes")}
        />
        <SaveRow saving={saving} dirty={form.isDirty()} error={error} close={close} />
      </Stack>
    </form>
  );
}

export function CountryOfOriginForm({ student }: { student: StudentForAdmin }) {
  const { form, submit, error, saving, close } = useSave(
    { countryOfOrigin: student.countryOfOrigin ?? "" },
    (values) => updateStudentCountry({ id: student.id, ...values }),
    "Saved",
  );
  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Select
          label={`${student.firstName}'s country of origin`}
          data={countryOptions(preferNotToSay)}
          searchable
          value={form.values.countryOfOrigin || preferNotToSay}
          onChange={(v) =>
            form.setFieldValue("countryOfOrigin", v === preferNotToSay ? "" : (v ?? ""))
          }
          allowDeselect={false}
          maw={320}
        />
        <SaveRow saving={saving} dirty={form.isDirty()} error={error} close={close} />
      </Stack>
    </form>
  );
}
