"use client";

import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconAlertTriangle } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FamilyTable } from "@/components/FamilyTable";
import { Field } from "@/components/Field";
import { FormError } from "@/components/FormError";
import { ReviewCard } from "@/components/ReviewCard";
import { toast } from "@/components/toast";
import {
  ClassPicker,
  ClassSummary,
  isFull,
  places,
  type ClassChoice,
} from "@/app/admin/academics/classes/ClassPicker";
import { ageOn } from "@/lib/age";
import type { Application } from "@/lib/db/queries/applications";
import type { FamilyMember } from "@/lib/db/queries/families";
import { proficiencyLabels, relationshipLabels } from "@/lib/demographics";
import { formatEuros } from "@/lib/money";
import { approveApplication } from "./actions";

type Props = {
  application: Application | null;
  classes: ClassChoice[];
  family: FamilyMember[];
  standardFeeCents: number;
  today: string;
  onClose: () => void;
  // Where to go once the place is offered (the inbox stays put; a student page reloads).
  onDone?: () => void;
};

// Offering a place, from wherever the office is: the child and what the family asked for,
// the family, the class picker with each class's facts, the fee, and an amber card with
// the offer to check before it goes. A class other than the one asked for gets a warning
// and an optional word to the family.
export function OfferPlaceModal({ application, onClose, ...rest }: Props) {
  return (
    <Modal
      opened={application !== null}
      onClose={onClose}
      title={application ? `Offer ${application.firstName} a place` : ""}
      size="xl"
    >
      {application && (
        // Keyed so a fresh form starts for each child.
        <OfferForm key={application.id} application={application} onClose={onClose} {...rest} />
      )}
    </Modal>
  );
}

function OfferForm({
  application: a,
  classes,
  family,
  standardFeeCents,
  today,
  onClose,
  onDone,
}: Omit<Props, "application"> & { application: Application }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  // The session is what we respect; the class is our call. So the picker starts on the
  // class the family named (or empty), offers the preferred session's classes unless
  // asked for every session, and can be narrowed by teacher.
  const [everySession, setEverySession] = useState(a.preferredSessionId === null);
  const [teacher, setTeacher] = useState<string | null>(null);
  const form = useForm<{ classId: string | null; fee: string; feeNote: string; offerNote: string }>(
    {
      // The server's "check the highlighted fields" goes as soon as something changes.
      onValuesChange: () => setError(null),
      initialValues: {
        // The class the family named, if they named one; otherwise the office chooses.
        classId: classes.some((c) => c.id === a.preferredClassId)
          ? String(a.preferredClassId)
          : null,
        fee: formatEuros(standardFeeCents).replace(/[€,]/g, ""),
        feeNote: "",
        offerNote: "",
      },
    },
  );
  const chosen = classes.find((c) => String(c.id) === form.values.classId) ?? null;
  const full = chosen ? isFull(chosen) : false;
  const sessionDiffers =
    !!chosen && a.preferredSessionId !== null && chosen.sessionId !== a.preferredSessionId;
  const classDiffers =
    !!chosen && !sessionDiffers && a.preferredClassId !== null && chosen.id !== a.preferredClassId;
  const teachers = [...new Set(classes.flatMap((c) => c.classTeacherName ?? []))].sort();
  const offered = classes.filter(
    (c) =>
      (everySession || c.sessionId === a.preferredSessionId) &&
      (!teacher || c.classTeacherName === teacher),
  );
  const guardian = `${a.guardian.name} (${relationshipLabels[a.guardian.relationship as keyof typeof relationshipLabels]})`;

  const submit = form.onSubmit(async (values) => {
    // A second press while the first is in flight must not offer twice.
    if (saving) return;
    setSaving(true);
    setError(null);
    const result = await approveApplication({
      id: a.id,
      classId: Number(values.classId),
      fee: values.fee,
      feeNote: values.feeNote,
      offerNote: sessionDiffers ? values.offerNote : "",
      overCapacity: full && confirmed,
    });
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(`${a.firstName} is now ${result.data.studentId}`);
    onClose();
    onDone?.();
    router.refresh();
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Group gap="xs">
          {a.allergies && <Badge color="clay">Allergies</Badge>}
          {a.medicalNotes && <Badge color="saffron">Medical</Badge>}
        </Group>
        {a.status === "declined" && (
          <Alert
            color="saffron"
            variant="light"
            icon={<IconAlertTriangle size={16} stroke={1.75} />}
          >
            This application was declined
            {a.decidedAt ? ` on ${dayjs(a.decidedAt).format("D MMM YYYY")}` : ""}
            {a.declinedReason ? `: "${a.declinedReason}"` : "."} Offering a place now replaces that
            decision and emails the family as usual.
          </Alert>
        )}
        <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
          <Field
            label="Age"
            value={`${ageOn(a.dateOfBirth, today)} (${dayjs(a.dateOfBirth).format("D MMM YYYY")})`}
          />
          <Field label="Gender" value={a.gender === "male" ? "Boy" : "Girl"} />
          <Field label="School year" value={a.schoolYearGroup} />
          <Field label="Arabic" value={proficiencyLabels[a.arabicProficiency]} />
          <Field label="Session asked for" value={a.preferredSessionName ?? "No preference"} />
          <Field label="Class asked for" value={a.preferredClassName ?? "No preference"} />
          <Field label="Guardian" value={guardian} />
          <Field
            label="Applied"
            value={`${dayjs(a.appliedAt).format("D MMM YYYY")} · ${a.guardian.email}`}
          />
        </SimpleGrid>
        {a.applicationNotes && (
          <Text size="sm">
            <Text component="span" fw={500}>
              From the family:
            </Text>{" "}
            {a.applicationNotes}
          </Text>
        )}
        {family.length > 0 && (
          <div>
            <Text size="sm" fw={500} mb={4}>
              Also in this family
            </Text>
            <FamilyTable members={family} />
          </div>
        )}
        <Group align="flex-end" gap="sm" wrap="wrap">
          <Select
            label="Teacher"
            placeholder="Any teacher"
            data={teachers}
            value={teacher}
            clearable
            searchable
            onChange={setTeacher}
            w={220}
          />
          {a.preferredSessionId !== null && (
            <Checkbox
              label="Show every session"
              checked={everySession}
              onChange={(e) => setEverySession(e.currentTarget.checked)}
              pb={8}
            />
          )}
        </Group>
        <ClassPicker
          label="Class"
          description={
            everySession
              ? undefined
              : `Classes on ${a.preferredSessionName}, the session the family asked for`
          }
          options={offered}
          value={form.values.classId}
          onChange={(v) => {
            form.setFieldValue("classId", v);
            setConfirmed(false);
          }}
          error={form.errors.classId as string | undefined}
        />
        <Group grow align="flex-start">
          <TextInput
            label="Fee for the year"
            leftSection="€"
            withAsterisk
            {...form.getInputProps("fee")}
          />
          <TextInput
            label="Fee note"
            placeholder="Sibling discount"
            {...form.getInputProps("feeNote")}
          />
        </Group>
        {chosen && (
          <ReviewCard title="Offering">
            <ClassSummary
              cls={chosen}
              extra={
                <Field
                  label="Fee"
                  value={`€${form.values.fee}${form.values.feeNote ? ` · ${form.values.feeNote}` : ""}`}
                />
              }
            />
          </ReviewCard>
        )}
        {classDiffers && chosen && (
          <Text size="sm" c="dimmed">
            The family asked for {a.preferredClassName}; {chosen.name} is the office&apos;s call.
          </Text>
        )}
        {sessionDiffers && chosen && (
          <>
            <Alert
              color="saffron"
              variant="light"
              icon={<IconAlertTriangle size={16} stroke={1.75} />}
            >
              The family asked for {a.preferredSessionName}; this offer is on {chosen.sessionName}.
            </Alert>
            <Textarea
              label="Explain to the family (optional)"
              description="Goes in the email and on their child's page as written"
              placeholder="Saturday is full this year; Sunday covers the same material with the same teachers."
              autosize
              minRows={2}
              {...form.getInputProps("offerNote")}
            />
          </>
        )}
        {full && chosen && (
          <Alert
            color="saffron"
            variant="light"
            icon={<IconAlertTriangle size={16} stroke={1.75} />}
          >
            {chosen.name} is full: {places(chosen)} places taken
            {chosen.applicationCount > 0 &&
              ` and ${chosen.applicationCount} ${chosen.applicationCount === 1 ? "child is" : "children are"} waiting for it`}
            .
            <Checkbox
              mt="sm"
              label={`Place ${a.firstName} anyway — ${chosen.name} will be over capacity`}
              checked={confirmed}
              onChange={(e) => setConfirmed(e.currentTarget.checked)}
            />
          </Alert>
        )}
        <Text size="sm" c="dimmed">
          {guardian} will get an email with {a.firstName}&apos;s student ID and first password.
        </Text>
        <FormError message={error} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={!chosen || (full && !confirmed)}>
            Offer a place
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
