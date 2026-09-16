"use client";

import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import { formatEuros } from "@/lib/money";
import { updateEnrolmentFee } from "@/app/admin/fees/actions";

type Props = { enrolmentId: number; feeCents: number; feeNote: string | null; siblings: number };

// The agreed fee for the year. Discounts are a manual edit with a note (PLAN §5 "Fees").
export function EditFeeButton({ enrolmentId, feeCents, feeNote, siblings }: Props) {
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm({
    initialValues: { fee: formatEuros(feeCents).replace(/[€,]/g, ""), feeNote: feeNote ?? "" },
  });
  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = await updateEnrolmentFee({
      enrolmentId,
      fee: values.fee,
      feeNote: values.feeNote || null,
    });
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success("Fee updated");
    setOpened(false);
    router.refresh();
  });
  return (
    <>
      <Button variant="subtle" size="xs" onClick={() => setOpened(true)}>
        Edit fee
      </Button>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Edit fee">
        <form onSubmit={submit}>
          <Stack gap="md">
            <Group grow align="flex-start">
              <TextInput
                label="Fee for the year"
                leftSection="€"
                withAsterisk
                data-autofocus
                {...form.getInputProps("fee")}
              />
              <TextInput
                label="Fee note"
                placeholder="Sibling discount"
                {...form.getInputProps("feeNote")}
              />
            </Group>
            <Text size="sm" c="dimmed">
              {siblings === 0
                ? "No brothers or sisters are enrolled."
                : `${siblings} ${siblings === 1 ? "sibling is" : "siblings are"} enrolled.`}{" "}
              A fee of €0 shows as waived.
            </Text>
            <FormError message={error} />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setOpened(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save fee
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
