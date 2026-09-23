"use client";

import {
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  TagsInput,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/DateField";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import type { DayChoice } from "@/app/family/register-child/ApplicationWizard";
import { arabicProficiencies } from "@/lib/db/schema";
import { ageOn } from "@/lib/age";
import { commonAllergies, proficiencyLabels, yearGroupSections } from "@/lib/demographics";
import { updateApplication } from "./actions";

type Values = {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  schoolYearGroup: string;
  isHomeschooled: boolean;
  arabicProficiency: string;
  allergies: string[];
  medicalNotes: string;
  applicationNotes: string;
  preferredSessionId: number | null;
  preferredClassName: string;
};

// Mantine's Select needs a string for every option; this one stands for "no preference".
const anyDay = "any";

// A family correcting their child's application while it waits. Same questions as the
// wizard's child step, in one form.
export function EditApplication({
  id,
  child,
  days,
}: {
  id: number;
  child: Values;
  days: DayChoice[];
}) {
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<Values>({
    onValuesChange: () => setError(null),
    initialValues: child,
  });
  const day = days.find((d) => d.id === form.values.preferredSessionId);
  const levelNames = [
    ...new Set((day ? day.classes : days.flatMap((d) => d.classes)).map((c) => c.name)),
  ].sort();
  const age = form.values.dateOfBirth
    ? ageOn(form.values.dateOfBirth, new Date().toISOString().slice(0, 10))
    : null;

  const submit = form.onSubmit(async (values) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const result = await updateApplication({
      id,
      ...values,
      gender: values.gender as "male" | "female",
      dateOfBirth: values.dateOfBirth ?? "",
      arabicProficiency: values.arabicProficiency as (typeof arabicProficiencies)[number],
    });
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success("Application updated");
    close();
    router.refresh();
  });

  return (
    <>
      <Button
        variant="subtle"
        size="xs"
        leftSection={<IconPencil size={14} stroke={1.75} />}
        onClick={open}
      >
        Edit
      </Button>
      <Modal opened={opened} onClose={close} title="Edit the application" size="lg">
        <form onSubmit={submit}>
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
              <TextInput label="First name" withAsterisk {...form.getInputProps("firstName")} />
              <TextInput label="Surname" withAsterisk {...form.getInputProps("lastName")} />
              <DateField
                label="Date of birth"
                withAsterisk
                description={age === null ? undefined : `${age} years old`}
                inputWrapperOrder={["label", "input", "description", "error"]}
                {...form.getInputProps("dateOfBirth")}
              />
              <Select
                label="Gender"
                data={[
                  { value: "male", label: "Boy" },
                  { value: "female", label: "Girl" },
                ]}
                allowDeselect={false}
                {...form.getInputProps("gender")}
              />
              <Stack gap="xs">
                <Select
                  label="School year"
                  data={yearGroupSections}
                  searchable
                  clearable
                  withAsterisk={!form.values.isHomeschooled}
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
                label="Arabic"
                data={arabicProficiencies.map((p) => ({ value: p, label: proficiencyLabels[p] }))}
                allowDeselect={false}
                {...form.getInputProps("arabicProficiency")}
              />
              <Select
                label="Day"
                data={[
                  { value: anyDay, label: "Any day" },
                  ...days.map((d) => ({ value: String(d.id), label: d.label })),
                ]}
                allowDeselect={false}
                value={form.values.preferredSessionId?.toString() ?? anyDay}
                onChange={(v) => {
                  form.setFieldValue("preferredSessionId", v && v !== anyDay ? Number(v) : null);
                  const next = v && v !== anyDay ? days.find((d) => String(d.id) === v) : null;
                  const still =
                    !next || next.classes.some((c) => c.name === form.values.preferredClassName);
                  if (!still) form.setFieldValue("preferredClassName", "");
                }}
                error={form.errors.preferredSessionId}
              />
              <Select
                label="Class (if you have a preference)"
                placeholder="Leave it to the school"
                data={levelNames}
                searchable
                clearable
                value={form.values.preferredClassName || null}
                onChange={(v) => form.setFieldValue("preferredClassName", v ?? "")}
              />
            </SimpleGrid>
            <TagsInput
              label="Allergies"
              description="Pick from the list or type your own"
              data={commonAllergies}
              maxTags={10}
              {...form.getInputProps("allergies")}
            />
            <Textarea
              label="Medical needs"
              autosize
              minRows={2}
              {...form.getInputProps("medicalNotes")}
            />
            <Textarea
              label="Anything else we should know"
              autosize
              minRows={2}
              {...form.getInputProps("applicationNotes")}
            />
            <FormError message={error} />
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
