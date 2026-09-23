"use client";

import {
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  TagsInput,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconUserPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/DateField";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import {
  arabicProficiencies,
  type ArabicProficiency,
  type Gender,
  type GuardianGender,
  type Relationship,
} from "@/lib/db/schema";
import {
  commonAllergies,
  proficiencyLabels,
  relationshipLabels,
  relationshipsFor,
  yearGroupSections,
} from "@/lib/demographics";
import { addChildForGuardian } from "./actions";

type Props = {
  guardian: { id: number; name: string; gender: GuardianGender | null };
  // Sessions with the classes a family may ask for, as in the wizard.
  sessions: { id: number; name: string; classes: { id: number; name: string }[] }[];
  // The other guardians of this guardian's children, offered for the new child too.
  coGuardians: { id: number; name: string; relationship: Relationship }[];
};

// Mantine's Select needs a string for every option; this one stands for "no preference".
const anyDay = "any";

// The office registers a child on the family's behalf, asking what the wizard asks;
// approve from the inbox afterwards.
export function AddChildButton({ guardian, sessions, coGuardians }: Props) {
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const relationshipOptions = relationshipsFor(guardian.gender);
  const form = useForm({
    // The server's "check the highlighted fields" goes as soon as something changes.
    onValuesChange: () => setError(null),
    initialValues: {
      firstName: "",
      lastName: guardian.name.split(" ").slice(-1)[0] ?? "",
      gender: null as Gender | null,
      dateOfBirth: null as string | null,
      schoolYearGroup: null as string | null,
      isHomeschooled: false,
      arabicProficiency: "none" as ArabicProficiency,
      allergies: [] as string[],
      medicalNotes: "",
      applicationNotes: "",
      relationship: (guardian.gender === "female"
        ? "mother"
        : guardian.gender === "male"
          ? "father"
          : null) as Relationship | null,
      preferredSessionId: sessions[0] ? String(sessions[0].id) : anyDay,
      preferredClassName: "",
      alsoGuardianIds: coGuardians.map((g) => String(g.id)),
    },
  });
  const session = sessions.find((s) => String(s.id) === form.values.preferredSessionId);
  // A class is a level on a day; with no day chosen every level is offered once.
  const levelNames = [
    ...new Set((session ? session.classes : sessions.flatMap((s) => s.classes)).map((c) => c.name)),
  ].sort();
  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = await addChildForGuardian({
      guardianId: guardian.id,
      firstName: values.firstName,
      lastName: values.lastName,
      gender: values.gender as Gender,
      dateOfBirth: values.dateOfBirth ?? "",
      schoolYearGroup: values.schoolYearGroup,
      isHomeschooled: values.isHomeschooled,
      arabicProficiency: values.arabicProficiency,
      allergies: values.allergies,
      medicalNotes: values.medicalNotes,
      applicationNotes: values.applicationNotes,
      relationship: values.relationship as Relationship,
      preferredSessionId:
        values.preferredSessionId && values.preferredSessionId !== anyDay
          ? Number(values.preferredSessionId)
          : null,
      preferredClassName: values.preferredClassName,
      alsoGuardians: coGuardians
        .filter((g) => values.alsoGuardianIds.includes(String(g.id)))
        .map(({ id, relationship }) => ({ id, relationship })),
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
      <Modal opened={opened} onClose={close} title={`Add a child for ${guardian.name}`} size="lg">
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
              <Stack gap="xs">
                <Select
                  label="School year"
                  description="The year they are in, or would be"
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
            <TagsInput
              label="Allergies"
              description="Pick from the list or type. Leave blank if none."
              data={commonAllergies}
              maxTags={10}
              {...form.getInputProps("allergies")}
            />
            <Textarea
              label="Medical needs or anything else teachers should know"
              autosize
              minRows={2}
              {...form.getInputProps("medicalNotes")}
            />
            <Textarea
              label="Anything else from the family"
              autosize
              minRows={2}
              {...form.getInputProps("applicationNotes")}
            />
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
                data={[
                  { value: anyDay, label: "Any day" },
                  ...sessions.map((s) => ({ value: String(s.id), label: s.name })),
                ]}
                allowDeselect={false}
                value={form.values.preferredSessionId}
                onChange={(v) => {
                  form.setFieldValue("preferredSessionId", v ?? anyDay);
                  const next = sessions.find((x) => String(x.id) === v);
                  const still =
                    !next || next.classes.some((c) => c.name === form.values.preferredClassName);
                  if (!still) form.setFieldValue("preferredClassName", "");
                }}
                error={form.errors.preferredSessionId}
              />
              <Select
                label="Preferred class"
                description="Optional — the office decides the placement"
                data={levelNames}
                disabled={levelNames.length === 0}
                searchable
                clearable
                value={form.values.preferredClassName || null}
                onChange={(v) => form.setFieldValue("preferredClassName", v ?? "")}
              />
            </Group>
            {coGuardians.length > 0 && (
              <Checkbox.Group label="Also a child of" {...form.getInputProps("alsoGuardianIds")}>
                <Group gap="md" mt="xs">
                  {coGuardians.map((g) => (
                    <Checkbox
                      key={g.id}
                      value={String(g.id)}
                      label={`${g.name} (${relationshipLabels[g.relationship]})`}
                    />
                  ))}
                </Group>
              </Checkbox.Group>
            )}
            <Text size="sm" c="dimmed">
              This creates an application in the family&apos;s name. Approve it from Applications to
              give the child a class and a fee.
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
