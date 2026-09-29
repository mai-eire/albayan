"use client";

import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/DateField";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import type { PaymentRow, PaymentTarget } from "@/lib/db/queries/fees";
import { paymentMethods } from "@/lib/db/schema";
import { methodLabels } from "@/lib/fees";
import { eurosToCents, formatEuros } from "@/lib/money";
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
  // What the year still owes before this payment. A payment being corrected doesn't count
  // against itself, so the office sees the balance it is editing towards.
  const paidBefore = target ? target.paidCents - (existing?.amountCents ?? 0) : 0;
  const owedCents = target ? Math.max(0, target.feeCents - paidBefore) : 0;
  const typedCents = centsOf(form.values.amount);
  const tooMuch = target !== undefined && typedCents !== null && typedCents > owedCents;
  const [confirmed, setConfirmed] = useState(false);

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
      overPayment: tooMuch && confirmed,
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
              data={targets.map((t) => ({
                value: String(t.enrolmentId),
                label: t.studentCode ? `${t.label} · ${t.studentCode}` : t.label,
              }))}
              searchable
              withAsterisk
              allowDeselect={false}
              nothingFoundMessage="No child with that name or ID has a place this year"
              value={form.values.enrolmentId ? String(form.values.enrolmentId) : null}
              onChange={(v) => {
                const next = targets.find((t) => String(t.enrolmentId) === v);
                form.setFieldValue("enrolmentId", next?.enrolmentId ?? null);
                form.setFieldValue("paidByGuardianId", next?.guardians[0]?.id ?? null);
              }}
              error={form.errors.enrolmentId}
            />
          )}
          {target && (
            <Text size="sm" c="dimmed">
              {target.feeCents === 0 ? (
                "The fee is waived — nothing is outstanding."
              ) : (
                <>
                  Paid {formatEuros(paidBefore)} of {formatEuros(target.feeCents)} ·{" "}
                  {owedCents > 0 ? (
                    <Text span fw={700} c="saffron">
                      {formatEuros(owedCents)} outstanding
                    </Text>
                  ) : (
                    "nothing outstanding"
                  )}
                </>
              )}
            </Text>
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
          {tooMuch && (
            <Alert
              color="saffron"
              variant="light"
              icon={<IconAlertTriangle size={16} stroke={1.75} />}
            >
              {owedCents > 0
                ? `That's ${formatEuros((typedCents ?? 0) - owedCents)} more than the ${formatEuros(owedCents)} still owed.`
                : `Nothing is owed${target?.feeCents === 0 ? " — the fee is waived" : ""}.`}
              <Checkbox
                mt="sm"
                label="Record it anyway — the family will be in credit"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.currentTarget.checked)}
              />
            </Alert>
          )}
          <FormError message={error} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={tooMuch && !confirmed}>
              {existing ? "Save payment" : "Record payment"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

// The typed amount in cents, or null while it isn't a number yet.
function centsOf(amount: string): number | null {
  try {
    return eurosToCents(amount.trim() || "0");
  } catch {
    return null;
  }
}
