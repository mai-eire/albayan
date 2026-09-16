"use client";

import { Button, Group, Modal, Stack, Switch, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/DateField";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import { yearIdFor } from "@/lib/academics";
import { formatEuros } from "@/lib/money";
import { createYear, updateYear, type YearInput } from "./actions";

type Existing = {
  id: string;
  startDate: string;
  endDate: string;
  standardFeeCents: number;
  isCurrent: boolean;
};

// One form for creating and editing a year. Editing is inline on the year page;
// creating happens in a modal from the list.
export function YearForm({ existing, onDone }: { existing?: Existing; onDone?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<YearInput>({
    initialValues: {
      startDate: existing?.startDate ?? "",
      endDate: existing?.endDate ?? "",
      standardFee: existing ? formatEuros(existing.standardFeeCents).replace(/[€,]/g, "") : "",
      isCurrent: existing?.isCurrent ?? false,
    },
  });

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = existing
      ? await updateYear({ id: existing.id, ...values })
      : await createYear(values);
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(existing ? "Year saved" : `${yearIdFor(values.startDate)} added`);
    form.resetDirty(values);
    onDone?.();
    if (!existing) router.push(`/admin/academics/years/${yearIdFor(values.startDate)}`);
    else router.refresh();
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Group grow>
          <DateField label="First day" withAsterisk {...form.getInputProps("startDate")} />
          <DateField label="Last day" withAsterisk {...form.getInputProps("endDate")} />
        </Group>
        {form.values.startDate && !existing && (
          <TextInput
            label="Name"
            value={yearIdFor(form.values.startDate)}
            readOnly
            description="Taken from the first day"
          />
        )}
        <TextInput
          label="Standard fee"
          description="Per child per year; each enrolment can be adjusted"
          leftSection="€"
          maw={220}
          {...form.getInputProps("standardFee")}
        />
        <Switch
          label="This is the current year"
          {...form.getInputProps("isCurrent", { type: "checkbox" })}
        />
        <FormError message={error} />
        <Group justify="flex-end">
          <Button type="submit" loading={saving}>
            {existing ? "Save year" : "Add year"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function AddYearButton() {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button leftSection={<IconPlus size={16} stroke={1.75} />} onClick={open}>
        Add year
      </Button>
      <Modal opened={opened} onClose={close} title="Add an academic year">
        <YearForm onDone={close} />
      </Modal>
    </>
  );
}
