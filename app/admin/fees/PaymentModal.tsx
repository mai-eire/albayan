"use client";

import { Button, Group, Modal, Select, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/DateField";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import type { PaymentRow, PaymentTarget } from "@/lib/db/queries/fees";
import { paymentMethods } from "@/lib/db/schema";
import { methodLabels } from "@/lib/fees";
import { formatEuros } from "@/lib/money";
import { recordPayment, updatePayment } from "./actions";

type Props = {
  opened: boolean;
  onClose: () => void;
  // The places a payment can go against. One target fixes the child; several show a picker.
  targets: PaymentTarget[];
  // Editing an existing payment; its child is the single target.
  existing?: PaymentRow | null;
  today: string;
};

const methodOptions = paymentMethods.map((m) => ({ value: m, label: methodLabels[m] }));

type Values = {
  enrolmentId: number | null;
  amount: string;
  method: PaymentRow["method"];
  paidOn: string;
  paidByGuardianId: number | null;
  reference: string;
  note: string;
};

// Record or correct a payment (§4.8): amount in euros, how, when, by whom.
export function PaymentModal({ opened, onClose, targets, existing, today }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const only = targets.length === 1 ? targets[0] : null;
  const form = useForm<Values>({
    initialValues: {
      enrolmentId: existing?.enrolmentId ?? only?.enrolmentId ?? null,
      amount: existing ? formatEuros(existing.amountCents).replace(/[€,]/g, "") : "",
      method: existing?.method ?? "cash",
      paidOn: existing?.paidOn ?? today,
      paidByGuardianId: existing?.paidByGuardianId ?? only?.guardians[0]?.id ?? null,
      reference: existing?.reference ?? "",
      note: existing?.note ?? "",
    },
  });
  const target = targets.find((t) => t.enrolmentId === form.values.enrolmentId);

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const fields = {
      amount: values.amount,
      method: values.method,
      paidOn: values.paidOn,
      paidByGuardianId: values.paidByGuardianId,
      reference: values.reference || null,
      note: values.note || null,
    };
    const result = existing
      ? await updatePayment({ id: existing.id, ...fields })
      : await recordPayment({ enrolmentId: values.enrolmentId ?? 0, ...fields });
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(existing ? "Payment updated" : "Payment recorded");
    onClose();
    form.reset();
    router.refresh();
  });

  return (
    <Modal opened={opened} onClose={onClose} title={existing ? "Edit payment" : "Record payment"}>
      <form onSubmit={submit}>
        <Stack gap="md">
          {!existing && targets.length !== 1 && (
            <Select
              label="Child"
              placeholder="Search by name"
              data={targets.map((t) => ({ value: String(t.enrolmentId), label: t.label }))}
              searchable
              withAsterisk
              allowDeselect={false}
              nothingFoundMessage="No child with that name has a place this year"
              value={form.values.enrolmentId ? String(form.values.enrolmentId) : null}
              onChange={(v) => {
                const next = targets.find((t) => String(t.enrolmentId) === v);
                form.setFieldValue("enrolmentId", next?.enrolmentId ?? null);
                form.setFieldValue("paidByGuardianId", next?.guardians[0]?.id ?? null);
              }}
              error={form.errors.enrolmentId}
            />
          )}
          <Group grow align="flex-start">
            <TextInput
              label="Amount"
              leftSection="€"
              withAsterisk
              data-autofocus
              {...form.getInputProps("amount")}
            />
            <Select
              label="How"
              data={methodOptions}
              allowDeselect={false}
              withAsterisk
              {...form.getInputProps("method")}
            />
          </Group>
          <Group grow align="flex-start">
            <DateField
              label="Paid on"
              withAsterisk
              maxDate={today}
              {...form.getInputProps("paidOn")}
            />
            <Select
              label="Paid by"
              placeholder="Not recorded"
              data={(target?.guardians ?? []).map((g) => ({ value: String(g.id), label: g.name }))}
              clearable
              value={form.values.paidByGuardianId ? String(form.values.paidByGuardianId) : null}
              onChange={(v) => form.setFieldValue("paidByGuardianId", v ? Number(v) : null)}
              error={form.errors.paidByGuardianId}
            />
          </Group>
          <Group grow align="flex-start">
            <TextInput
              label="Reference"
              placeholder="Receipt or transfer reference"
              {...form.getInputProps("reference")}
            />
            <TextInput label="Note" {...form.getInputProps("note")} />
          </Group>
          <FormError message={error} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {existing ? "Save payment" : "Record payment"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
