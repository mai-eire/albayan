"use client";

import { Alert, Button, Checkbox, Group, Modal, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FamilyTable } from "@/components/FamilyTable";
import { FormError } from "@/components/FormError";
import { ReviewCard } from "@/components/ReviewCard";
import { toast } from "@/components/toast";
import type { FamilyMember } from "@/lib/db/queries/families";
import { moveStudent } from "./actions";
import { ClassPicker, ClassSummary, isFull, places, type ClassChoice } from "./ClassPicker";

export type { ClassChoice } from "./ClassPicker";

type Props = {
  student: { enrolmentId: number; firstName: string } | null;
  current: ClassChoice;
  options: ClassChoice[];
  // Their brothers and sisters, so the office can keep a family together.
  family?: FamilyMember[];
  onClose: () => void;
};

// Moves a student to another class of the year (the same modal from a class roster and
// from the student's page): the current class for comparison, the family, a picker that
// shows each class's teacher, places and waiting list, and a tick to go over capacity.
export function MoveStudentModal({ student, current, options, family = [], onClose }: Props) {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const chosen = options.find((c) => String(c.id) === target) ?? null;
  const full = chosen ? isFull(chosen) : false;

  const close = () => {
    setTarget(null);
    setConfirmed(false);
    setError(null);
    onClose();
  };
  const move = async () => {
    if (!student || !chosen || saving) return;
    setSaving(true);
    setError(null);
    const result = await moveStudent({
      enrolmentId: student.enrolmentId,
      classId: chosen.id,
      overCapacity: full && confirmed,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(`${student.firstName} moved to ${chosen.name}`);
    close();
    router.refresh();
  };

  return (
    <Modal
      opened={student !== null}
      onClose={close}
      title={student ? `Move ${student.firstName}` : ""}
      size="lg"
    >
      <Stack gap="md">
        <div>
          <Text size="sm" fw={500} mb={4}>
            Now in
          </Text>
          <ClassSummary cls={current} />
        </div>
        {family.length > 0 && (
          <div>
            <Text size="sm" fw={500} mb={4}>
              Also in this family
            </Text>
            <FamilyTable members={family} />
          </div>
        )}
        <ClassPicker
          label="Move to"
          options={options}
          value={target}
          onChange={(v) => {
            setTarget(v);
            setConfirmed(false);
          }}
        />
        {chosen && (
          <ReviewCard title="Moving to">
            <ClassSummary cls={chosen} />
          </ReviewCard>
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
              label={`Place ${student?.firstName} anyway — ${chosen.name} will be over capacity`}
              checked={confirmed}
              onChange={(e) => setConfirmed(e.currentTarget.checked)}
            />
          </Alert>
        )}
        <Text size="sm" c="dimmed">
          Their place in {current.name} ends today and the new one starts today, keeping the same
          fee. The family sees the new class straight away.
        </Text>
        <FormError message={error} />
        <Group justify="flex-end">
          <Button variant="default" onClick={close}>
            Cancel
          </Button>
          <Button onClick={move} loading={saving} disabled={!chosen || (full && !confirmed)}>
            Move student
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
