"use client";

import {
  Alert,
  Button,
  Card,
  Group,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CardTitle } from "@/components/CardTitle";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import type { Register } from "@/lib/db/queries/attendance";
import type { AttendanceStatus } from "@/lib/db/schema";
import { saveRegister } from "./actions";
import classes from "./RegisterEditor.module.css";

type Entry = { studentId: number; status: AttendanceStatus; note: string };

const statusOptions: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
];

// The same colours as StatusBadge's attendance domain (DESIGN §2.1).
const statusColor: Record<AttendanceStatus, string> = {
  present: "tile",
  late: "saffron",
  absent: "clay",
  excused: "gray",
};

// Everyone starts present; each row has a Present · Late · Absent · Excused control (§4.5).
// A note field appears for anyone not present. One save for the whole class.
export function RegisterEditor({
  register,
  editable,
  backHref,
}: {
  register: Register;
  editable: boolean;
  backHref: string;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>(
    register.rows.map((r) => ({
      studentId: r.studentId,
      status: r.status ?? "present",
      note: r.note ?? "",
    })),
  );
  const [dirty, setDirty] = useState(register.takenBy === null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (studentId: number, patch: Partial<Entry>) => {
    setEntries((all) => all.map((e) => (e.studentId === studentId ? { ...e, ...patch } : e)));
    setDirty(true);
  };
  const setStatus = (entry: Entry, next: AttendanceStatus) =>
    update(entry.studentId, { status: next, note: next === "present" ? "" : entry.note });

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await saveRegister({ classId: register.classId, date: register.date, entries });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(register.takenBy ? "Register updated" : "Register submitted");
    setDirty(false);
    router.refresh();
  };

  const absent = entries.filter((e) => e.status !== "present").length;

  return (
    <Card>
      <CardTitle
        context={
          absent > 0 && (
            <Text size="sm" c="dimmed">
              {absent} not present
            </Text>
          )
        }
      >
        {register.rows.length} students
      </CardTitle>
      {register.takenBy && (
        <Text size="sm" c="dimmed" mt={-8} mb="md">
          Taken by {register.takenBy.name}
        </Text>
      )}
      {!editable && (
        <Alert
          color="saffron"
          variant="light"
          icon={<IconInfoCircle size={16} stroke={1.75} />}
          mb="md"
        >
          This register can&apos;t be changed any more. Ask the office if something is wrong.
        </Alert>
      )}
      <Stack gap={0}>
        {register.rows.map((row) => {
          const entry = entries.find((e) => e.studentId === row.studentId)!;
          return (
            <div key={row.studentId} className={classes.row}>
              <Group justify="space-between" wrap="wrap" gap="sm">
                <Text fw={500}>
                  {row.firstName} {row.lastName}
                </Text>
                <SegmentedControl
                  size="xs"
                  color={statusColor[entry.status]}
                  value={entry.status}
                  onChange={(v) => editable && setStatus(entry, v as AttendanceStatus)}
                  readOnly={!editable}
                  data={statusOptions}
                  aria-label={`${row.firstName}'s attendance`}
                  className={classes.control}
                />
              </Group>
              {entry.status !== "present" && (
                <TextInput
                  aria-label={`Note for ${row.firstName}`}
                  placeholder="Note (optional)"
                  size="sm"
                  mt="xs"
                  value={entry.note}
                  readOnly={!editable}
                  onChange={(e) => update(row.studentId, { note: e.currentTarget.value })}
                />
              )}
            </div>
          );
        })}
      </Stack>
      <FormError message={error} />
      <Group justify="space-between" mt="md">
        <Button variant="default" onClick={() => router.push(backHref)}>
          Back
        </Button>
        {editable && (
          <Button onClick={submit} loading={saving} disabled={!dirty}>
            {register.takenBy ? "Save changes" : "Submit register"}
          </Button>
        )}
      </Group>
    </Card>
  );
}
