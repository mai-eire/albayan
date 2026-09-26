"use client";

import { Checkbox, Group, Select, Stack, TagsInput, TextInput } from "@mantine/core";
import type { GuardianProfile } from "@/lib/db/queries/students";
import { registrationReasons } from "@/lib/db/schema";
import {
  commonLanguages,
  guardianGenderOptions,
  preferNotToSay,
  reasonLabels,
} from "@/lib/demographics";
import { countryOptions } from "@/lib/countries";
import { SaveRow, useSave } from "@/components/EditableCard";
import { updateGuardianContact, updateGuardianSensitive } from "./actions";

export function ContactForm({ guardian }: { guardian: GuardianProfile }) {
  const { form, submit, error, saving, close } = useSave(
    {
      name: guardian.name,
      phone: guardian.phone ?? "",
      gender: guardian.gender,
      emergencyContactName: guardian.emergencyContactName ?? "",
      emergencyContactPhone: guardian.emergencyContactPhone ?? "",
      emergencyContactRelationship: guardian.emergencyContactRelationship ?? "",
    },
    (values) => updateGuardianContact({ id: guardian.id, ...values }),
    "Contact details saved",
  );
  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Group grow align="flex-start">
          <TextInput label="Name" withAsterisk {...form.getInputProps("name")} />
          <TextInput label="Phone" type="tel" {...form.getInputProps("phone")} />
          <Select
            label="Gender"
            placeholder="Prefer not to say"
            data={guardianGenderOptions}
            clearable
            {...form.getInputProps("gender")}
          />
        </Group>
        <TextInput
          label="Email"
          value={guardian.email}
          readOnly
          description="Their sign-in; they change it from their own account"
        />
        <Group grow align="flex-start">
          <TextInput label="Emergency contact" {...form.getInputProps("emergencyContactName")} />
          <TextInput
            label="Their phone"
            type="tel"
            {...form.getInputProps("emergencyContactPhone")}
          />
          <TextInput
            label="Relationship"
            placeholder="Aunt"
            {...form.getInputProps("emergencyContactRelationship")}
          />
        </Group>
        <SaveRow saving={saving} dirty={form.isDirty()} error={error} close={close} />
      </Stack>
    </form>
  );
}

export function SensitiveForm({ guardian }: { guardian: GuardianProfile }) {
  const s = guardian.sensitive;
  const { form, submit, error, saving, close } = useSave(
    {
      addressLine1: s.addressLine1 ?? "",
      addressLine2: s.addressLine2 ?? "",
      city: s.city ?? "",
      postalCode: s.postalCode ?? "",
      countryOfOrigin: s.countryOfOrigin ?? "",
      spokenLanguages: s.spokenLanguages,
      registrationReasons: s.registrationReasons,
      registrationReasonOther: s.registrationReasonOther ?? "",
    },
    (values) => updateGuardianSensitive({ id: guardian.id, ...values }),
    "Saved",
  );
  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Group grow align="flex-start">
          <TextInput label="Address" {...form.getInputProps("addressLine1")} />
          <TextInput label="Address line 2" {...form.getInputProps("addressLine2")} />
        </Group>
        <Group grow align="flex-start">
          <TextInput label="Town or city" {...form.getInputProps("city")} />
          <TextInput label="Eircode" {...form.getInputProps("postalCode")} />
        </Group>
        <Group grow align="flex-start">
          <Select
            label="Country of origin"
            data={countryOptions(preferNotToSay)}
            searchable
            value={form.values.countryOfOrigin || preferNotToSay}
            onChange={(v) =>
              form.setFieldValue("countryOfOrigin", v === preferNotToSay ? "" : (v ?? ""))
            }
            allowDeselect={false}
          />
          <TagsInput
            label="Languages at home"
            data={commonLanguages}
            maxTags={10}
            {...form.getInputProps("spokenLanguages")}
          />
        </Group>
        <Checkbox.Group
          label="Reasons for registering"
          {...form.getInputProps("registrationReasons")}
        >
          <Group gap="md" mt="xs">
            {registrationReasons.map((r) => (
              <Checkbox key={r} value={r} label={reasonLabels[r]} />
            ))}
          </Group>
        </Checkbox.Group>
        {form.values.registrationReasons.includes("other") && (
          <TextInput label="Other reason" {...form.getInputProps("registrationReasonOther")} />
        )}
        <SaveRow saving={saving} dirty={form.isDirty()} error={error} close={close} />
      </Stack>
    </form>
  );
}
