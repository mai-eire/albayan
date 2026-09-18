"use client";

import { Button, Checkbox, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import type { GuardianGender, Relationship } from "@/lib/db/schema";
import { guardianGenderOptions, relationshipLabels, relationshipsFor } from "@/lib/demographics";
import type { ActionResult } from "@/lib/actions";
import type { CoGuardianInput } from "@/lib/guardians";

type Outcome = { outcome: "invited" | "linked"; name: string };

type Values = {
  name: string;
  email: string;
  phone: string;
  gender: GuardianGender | null;
  relationship: Relationship | null;
  studentIds: string[];
};

// Name, email, who they are, which children. Everyone is ticked to start with. The same
// form serves a parent (their children) and the office (one student), each with its action.
export function AddParentForm({
  kids,
  submit: save,
  onDone,
}: {
  kids: { id: number; firstName: string }[];
  submit: (input: CoGuardianInput) => Promise<ActionResult<Outcome>>;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<Values>({
    // The server's "check the highlighted fields" goes as soon as something changes.
    onValuesChange: () => setError(null),
    initialValues: {
      name: "",
      email: "",
      phone: "",
      gender: null,
      relationship: null,
      studentIds: kids.map((k) => String(k.id)),
    },
  });
  const options = relationshipsFor(form.values.gender);
  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = await save({
      ...values,
      phone: values.phone || null,
      relationship: values.relationship as Relationship,
      studentIds: values.studentIds.map(Number),
    });
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(
      result.data.outcome === "invited"
        ? `We've emailed ${result.data.name} a link to set up their account`
        : `${result.data.name} can now see the children too`,
    );
    if (onDone) {
      onDone();
      router.refresh();
    } else router.push("/family");
  });
  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Group grow align="flex-start">
          <TextInput
            label="Their name"
            withAsterisk
            data-autofocus
            {...form.getInputProps("name")}
          />
          <TextInput
            label="Their email"
            type="email"
            withAsterisk
            {...form.getInputProps("email")}
          />
        </Group>
        <Group grow align="flex-start">
          <TextInput label="Their phone" type="tel" {...form.getInputProps("phone")} />
          <Select
            label="Gender"
            placeholder="Prefer not to say"
            data={guardianGenderOptions}
            clearable
            value={form.values.gender}
            onChange={(v) => {
              const gender = (v as GuardianGender | null) ?? null;
              form.setFieldValue("gender", gender);
              if (
                form.values.relationship &&
                !relationshipsFor(gender).includes(form.values.relationship)
              ) {
                form.setFieldValue("relationship", null);
              }
            }}
          />
          <Select
            label="They are the children's"
            placeholder="Choose"
            data={options.map((r) => ({ value: r, label: relationshipLabels[r] }))}
            withAsterisk
            allowDeselect={false}
            {...form.getInputProps("relationship")}
          />
        </Group>
        {kids.length > 1 && (
          <Checkbox.Group label="Which children" withAsterisk {...form.getInputProps("studentIds")}>
            <Group gap="md" mt="xs">
              {kids.map((k) => (
                <Checkbox key={k.id} value={String(k.id)} label={k.firstName} />
              ))}
            </Group>
          </Checkbox.Group>
        )}
        <Text size="sm" c="dimmed">
          They&apos;ll get an email with a link to set a password, and then see the same timetable,
          homework, attendance and fees you do for the children you tick. If they already have an
          account, the children are simply added to it.
        </Text>
        <FormError message={error} />
        <Group justify="flex-end">
          <Button type="submit" loading={saving}>
            Add parent
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
