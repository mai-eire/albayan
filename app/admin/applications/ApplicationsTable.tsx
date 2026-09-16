"use client";

import {
  Badge,
  Button,
  Drawer,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import { ageOn } from "@/lib/age";
import type { Application } from "@/lib/db/queries/applications";
import { proficiencyLabels, relationshipLabels } from "@/lib/demographics";
import { formatEuros } from "@/lib/money";
import { approveApplication, declineApplication } from "./actions";

export type Placement = { id: number; name: string; classes: { id: number; name: string }[] };

type Props = {
  applications: Application[];
  placements: Placement[];
  standardFeeCents: number;
  today: string;
};

export function ApplicationsTable({ applications, placements, standardFeeCents, today }: Props) {
  const [open, setOpen] = useState<Application | null>(null);
  const [deciding, setDeciding] = useState<"approve" | "decline" | null>(null);

  return (
    <>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Child</Table.Th>
            <Table.Th>School year</Table.Th>
            <Table.Th>Arabic</Table.Th>
            <Table.Th>Prefers</Table.Th>
            <Table.Th>Guardian</Table.Th>
            <Table.Th>Applied</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {applications.map((a) => (
            <Table.Tr key={a.id} onClick={() => setOpen(a)} style={{ cursor: "pointer" }}>
              <Table.Td>
                <Text fw={500}>
                  {a.firstName} {a.lastName}
                </Text>
                <Text size="sm" c="dimmed">
                  {ageOn(a.dateOfBirth, today)} · {a.gender === "male" ? "boy" : "girl"}
                  {a.siblings.length > 0 && ` · sibling of ${a.siblings.join(", ")}`}
                </Text>
              </Table.Td>
              <Table.Td>{a.schoolYearGroup ?? "—"}</Table.Td>
              <Table.Td>{proficiencyLabels[a.arabicProficiency]}</Table.Td>
              <Table.Td>
                {a.preferredSessionName ?? "—"}
                {a.preferredClassName && (
                  <Text size="sm" c="dimmed" component="span">
                    {" "}
                    · {a.preferredClassName}
                  </Text>
                )}
              </Table.Td>
              <Table.Td>
                {a.guardian.name}
                <Text size="sm" c="dimmed">
                  {relationshipLabels[a.guardian.relationship as keyof typeof relationshipLabels]}
                </Text>
              </Table.Td>
              <Table.Td>{dayjs(a.appliedAt).format("D MMM")}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Drawer
        opened={open !== null}
        onClose={() => setOpen(null)}
        position="right"
        size="md"
        title={open ? `${open.firstName} ${open.lastName}` : ""}
      >
        {open && (
          <Stack gap="lg">
            <Group gap="xs">
              {open.allergies && <Badge color="clay">Allergies</Badge>}
              {open.medicalNotes && <Badge color="saffron">Medical</Badge>}
              {open.siblings.length > 0 && (
                <Badge variant="outline" color="gray">
                  Sibling of {open.siblings.join(", ")}
                </Badge>
              )}
            </Group>
            <Details
              rows={[
                [
                  "Age",
                  `${ageOn(open.dateOfBirth, today)} (${dayjs(open.dateOfBirth).format("D MMM YYYY")})`,
                ],
                ["Gender", open.gender === "male" ? "Boy" : "Girl"],
                ["School year", open.schoolYearGroup],
                ["Arabic", proficiencyLabels[open.arabicProficiency]],
                [
                  "Prefers",
                  open.preferredSessionName
                    ? `${open.preferredSessionName}${open.preferredClassName ? ` · ${open.preferredClassName}` : ""}`
                    : null,
                ],
                ["Applied", dayjs(open.appliedAt).format("D MMM YYYY")],
              ]}
            />
            <Stack gap={4}>
              <Title order={4}>Health</Title>
              <Text size="sm">Allergies: {open.allergies || "none"}</Text>
              <Text size="sm">Medical: {open.medicalNotes || "none"}</Text>
            </Stack>
            {open.applicationNotes && (
              <Stack gap={4}>
                <Title order={4}>From the family</Title>
                <Text size="sm">{open.applicationNotes}</Text>
              </Stack>
            )}
            <Stack gap={4}>
              <Title order={4}>Guardian</Title>
              <Text size="sm">
                {open.guardian.name} (
                {relationshipLabels[open.guardian.relationship as keyof typeof relationshipLabels]})
              </Text>
              <Text size="sm" c="dimmed">
                {open.guardian.email}
                {open.guardian.phone && ` · ${open.guardian.phone}`}
              </Text>
            </Stack>
            <Group justify="flex-end" mt="md">
              <Button variant="light" color="clay" onClick={() => setDeciding("decline")}>
                Decline
              </Button>
              <Button onClick={() => setDeciding("approve")}>Offer a place</Button>
            </Group>
          </Stack>
        )}
      </Drawer>

      <Modal
        opened={open !== null && deciding === "approve"}
        onClose={() => setDeciding(null)}
        title={open ? `Offer ${open.firstName} a place` : ""}
      >
        {open && (
          <ApproveForm
            application={open}
            placements={placements}
            standardFeeCents={standardFeeCents}
            onDone={() => {
              setDeciding(null);
              setOpen(null);
            }}
            onCancel={() => setDeciding(null)}
          />
        )}
      </Modal>
      <Modal
        opened={open !== null && deciding === "decline"}
        onClose={() => setDeciding(null)}
        title={open ? `Decline ${open.firstName}'s application` : ""}
      >
        {open && (
          <DeclineForm
            application={open}
            onDone={() => {
              setDeciding(null);
              setOpen(null);
            }}
            onCancel={() => setDeciding(null)}
          />
        )}
      </Modal>
    </>
  );
}

function Details({ rows }: { rows: [string, string | null | undefined][] }) {
  return (
    <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
      {rows.map(([label, value]) => (
        <div key={label}>
          <Text size="xs" c="dimmed">
            {label}
          </Text>
          <Text size="sm">{value || "—"}</Text>
        </div>
      ))}
    </SimpleGrid>
  );
}

function ApproveForm({
  application,
  placements,
  standardFeeCents,
  onDone,
  onCancel,
}: {
  application: Application;
  placements: Placement[];
  standardFeeCents: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const preferred =
    placements.find((p) => p.id === application.preferredSessionId) ?? placements[0] ?? null;
  const form = useForm<{
    sessionId: number | null;
    classId: number | null;
    fee: string;
    feeNote: string;
  }>({
    initialValues: {
      sessionId: preferred?.id ?? null,
      classId:
        preferred?.classes.find((c) => c.id === application.preferredClassId)?.id ??
        preferred?.classes[0]?.id ??
        null,
      fee: formatEuros(standardFeeCents).replace(/[€,]/g, ""),
      feeNote: "",
    },
  });
  const session = placements.find((p) => p.id === form.values.sessionId);

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = await approveApplication({
      id: application.id,
      classId: values.classId,
      fee: values.fee,
      feeNote: values.feeNote,
    });
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(`${application.firstName} is now ${result.data.studentId}`);
    onDone();
    router.refresh();
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Group grow>
          <Select
            label="Day"
            data={placements.map((p) => ({ value: String(p.id), label: p.name }))}
            allowDeselect={false}
            value={form.values.sessionId?.toString() ?? null}
            onChange={(v) => {
              const next = placements.find((p) => p.id === Number(v));
              form.setFieldValue("sessionId", next?.id ?? null);
              form.setFieldValue("classId", next?.classes[0]?.id ?? null);
            }}
          />
          <Select
            label="Class"
            data={(session?.classes ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
            allowDeselect={false}
            withAsterisk
            value={form.values.classId?.toString() ?? null}
            onChange={(v) => form.setFieldValue("classId", v ? Number(v) : null)}
            error={form.errors.classId}
          />
        </Group>
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
        <Text size="sm" c="dimmed">
          {application.guardian.name} will get an email with {application.firstName}&apos;s student
          ID and first password.
        </Text>
        <FormError message={error} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Offer the place
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function DeclineForm({
  application,
  onDone,
  onCancel,
}: {
  application: Application;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm({ initialValues: { reason: "" } });

  const submit = form.onSubmit(async ({ reason }) => {
    setSaving(true);
    setError(null);
    const result = await declineApplication({ id: application.id, reason });
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(`${application.guardian.name} has been told`);
    onDone();
    router.refresh();
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Textarea
          label="Reason"
          description={`Sent to ${application.guardian.name} as written`}
          placeholder="We're full for this year; we'll contact you if a place opens up."
          autosize
          minRows={3}
          withAsterisk
          data-autofocus
          {...form.getInputProps("reason")}
        />
        <FormError message={error} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" color="clay" loading={saving}>
            Decline and email
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
