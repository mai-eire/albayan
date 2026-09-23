"use client";

import {
  Button,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
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
import { proficiencyLabels, yearGroups } from "@/lib/demographics";
import { updateApplication } from "./actions";

type Values = {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  schoolYearGroup: string;
  arabicProficiency: string;
  allergies: string;
  medicalNotes: string;
  applicationNotes: string;
  preferredSessionId: number | null;
  preferredClassId: number | null;
};

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
      preferredSessionId: values.preferredSessionId ?? 0,
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
              <Select
                label="School year"
                data={yearGroups}
                searchable
                clearable
                {...form.getInputProps("schoolYearGroup")}
              />
              <Select
                label="Arabic"
                data={arabicProficiencies.map((p) => ({ value: p, label: proficiencyLabels[p] }))}
                allowDeselect={false}
                {...form.getInputProps("arabicProficiency")}
              />
              <Select
                label="Day"
                data={days.map((d) => ({ value: String(d.id), label: d.label }))}
                allowDeselect={false}
                value={form.values.preferredSessionId?.toString() ?? null}
                onChange={(v) => {
                  form.setFieldValue("preferredSessionId", v ? Number(v) : null);
                  form.setFieldValue("preferredClassId", null);
                }}
                error={form.errors.preferredSessionId}
              />
              <Select
                label="Class (if you have a preference)"
                placeholder="Leave it to the school"
                data={(day?.classes ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
                clearable
                value={form.values.preferredClassId?.toString() ?? null}
                onChange={(v) => form.setFieldValue("preferredClassId", v ? Number(v) : null)}
              />
            </SimpleGrid>
            <Textarea label="Allergies" autosize minRows={2} {...form.getInputProps("allergies")} />
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
