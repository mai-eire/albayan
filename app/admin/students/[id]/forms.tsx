"use client";

import { Button, Group, Select, Stack, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/DateField";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import type { StudentForAdmin } from "@/lib/db/queries/students";
import { arabicProficiencies } from "@/lib/db/schema";
import { ethnicities, preferNotToSay, proficiencyLabels, yearGroups } from "@/lib/demographics";
import { updateStudentDetails, updateStudentEthnicity, updateStudentHealth } from "./actions";

type Result =
  { ok: true; data: unknown } | { ok: false; error: string; fieldErrors?: Record<string, string> };

// The three cards share one save routine: submit, show field errors or a toast, refresh.
function useSave<V extends Record<string, unknown>>(
  initial: V,
  save: (values: V) => Promise<Result>,
  done: string,
) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<V>({ initialValues: initial });
  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = await save(values);
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(done);
    form.resetDirty(values);
    router.refresh();
  });
  return { form, submit, error, saving };
}

function SaveRow({
  saving,
  dirty,
  error,
}: {
  saving: boolean;
  dirty: boolean;
  error: string | null;
}) {
  return (
    <>
      <FormError message={error} />
      <Group justify="flex-end">
        <Button type="submit" loading={saving} disabled={!dirty}>
          Save changes
        </Button>
      </Group>
    </>
  );
}

export function DetailsForm({ student }: { student: StudentForAdmin }) {
  const { form, submit, error, saving } = useSave(
    {
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      schoolYearGroup: student.schoolYearGroup,
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
        <Group grow>
          <Select
            label="School year"
            data={yearGroups}
            clearable
            {...form.getInputProps("schoolYearGroup")}
          />
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
        <SaveRow saving={saving} dirty={form.isDirty()} error={error} />
      </Stack>
    </form>
  );
}

export function HealthForm({ student }: { student: StudentForAdmin }) {
  const { form, submit, error, saving } = useSave(
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
        <SaveRow saving={saving} dirty={form.isDirty()} error={error} />
      </Stack>
    </form>
  );
}

export function EthnicityForm({ student }: { student: StudentForAdmin }) {
  const { form, submit, error, saving } = useSave(
    { ethnicity: student.ethnicity ?? "" },
    (values) => updateStudentEthnicity({ id: student.id, ...values }),
    "Saved",
  );
  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Select
          label={`${student.firstName}'s ethnicity`}
          data={[...ethnicities, preferNotToSay]}
          value={form.values.ethnicity || preferNotToSay}
          onChange={(v) => form.setFieldValue("ethnicity", v === preferNotToSay ? "" : (v ?? ""))}
          allowDeselect={false}
          maw={320}
        />
        <SaveRow saving={saving} dirty={form.isDirty()} error={error} />
      </Stack>
    </form>
  );
}
