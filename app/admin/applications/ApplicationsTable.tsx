"use client";

import {
  Badge,
  Button,
  Drawer,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Select,
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
import { useDebouncedCallback } from "@mantine/hooks";
import { IconInbox, IconSearch } from "@tabler/icons-react";
import { ClassFilter, type ClassFilterOption } from "@/components/ClassFilter";
import { Nothing } from "@/components/Nothing";
import { EmptyState } from "@/components/EmptyState";
import { Field } from "@/components/Field";
import { useUrlFilters } from "@/components/useUrlFilters";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import { ageOn } from "@/lib/age";
import type { Application } from "@/lib/db/queries/applications";
import { proficiencyLabels, relationshipLabels } from "@/lib/demographics";
import type { ClassChoice } from "@/app/admin/academics/classes/ClassPicker";
import type { FamilyMember } from "@/lib/db/queries/families";
import { declineApplication } from "./actions";
import { OfferPlaceModal } from "./OfferPlaceModal";

type Props = {
  applications: Application[];
  classes: ClassChoice[];
  sessions: { id: number; name: string }[];
  // Each applicant's brothers and sisters, keyed by student id.
  families: Record<number, FamilyMember[]>;
  standardFeeCents: number;
  today: string;
};

// Filters above (child or guardian, the session and class asked for), one row per child.
export function ApplicationsTable({
  applications,
  classes,
  sessions,
  families,
  standardFeeCents,
  today,
}: Props) {
  const [open, setOpen] = useState<Application | null>(null);
  const [deciding, setDeciding] = useState<"approve" | "decline" | null>(null);
  const { params, set } = useUrlFilters();
  const q = params.get("q")?.trim().toLowerCase();
  const session = params.get("session");
  const cls = params.get("class");
  const search = useDebouncedCallback((value: string) => set({ q: value }), 300);
  const shown = applications.filter(
    (a) =>
      (!session || String(a.preferredSessionId) === session) &&
      (!cls || String(a.preferredClassId) === cls) &&
      (!q ||
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
        a.guardian.name.toLowerCase().includes(q)),
  );
  const classOptions: ClassFilterOption[] = classes.map((c) => ({
    id: c.id,
    name: c.name,
    sessionId: c.sessionId,
    sessionName: c.sessionName,
  }));

  return (
    <>
      <Group gap="sm" wrap="wrap">
        <TextInput
          aria-label="Search"
          placeholder="Child or guardian"
          leftSection={<IconSearch size={16} stroke={1.75} />}
          defaultValue={params.get("q") ?? ""}
          onChange={(e) => search(e.currentTarget.value)}
          w={{ base: "100%", xs: 240 }}
        />
        <Select
          aria-label="Preferred session"
          placeholder="Any session asked for"
          data={sessions.map((s) => ({ value: String(s.id), label: s.name }))}
          value={session}
          clearable
          onChange={(v) => set({ session: v, class: null })}
          w={200}
        />
        <ClassFilter
          classes={classOptions}
          sessionId={session}
          value={cls}
          onChange={(v) => set({ class: v })}
        />
        <Text size="sm" c="dimmed" ms="auto">
          {shown.length} waiting
        </Text>
      </Group>
      {shown.length === 0 && (
        <EmptyState
          icon={<IconInbox size={20} stroke={1.75} />}
          message="No applications match. Try clearing a filter."
        />
      )}
      <Table highlightOnHover display={shown.length ? undefined : "none"}>
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
          {shown.map((a) => (
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
              <Table.Td>{a.schoolYearGroup ?? <Nothing>not given</Nothing>}</Table.Td>
              <Table.Td>{proficiencyLabels[a.arabicProficiency]}</Table.Td>
              <Table.Td>
                {a.preferredSessionName ?? <Nothing>no preference</Nothing>}
                {a.preferredSessionName && (
                  <Text size="sm" c="dimmed" component="span">
                    {" "}
                    · {a.preferredClassName ?? "any class"}
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
            <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
              {(
                [
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
                ] as [string, string | null | undefined][]
              ).map(([label, value]) => (
                <Field key={label} label={label} value={value} />
              ))}
            </SimpleGrid>
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

      <OfferPlaceModal
        application={open && deciding === "approve" ? open : null}
        classes={classes}
        family={open ? (families[open.id] ?? []) : []}
        standardFeeCents={standardFeeCents}
        today={today}
        onClose={() => setDeciding(null)}
        onDone={() => setOpen(null)}
      />
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
