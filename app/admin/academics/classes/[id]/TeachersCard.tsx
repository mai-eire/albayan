"use client";

import { Alert, Button, Card, Group, Select, Stack, Table, Text, Timeline } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CardTitle } from "@/components/CardTitle";
import { FormError } from "@/components/FormError";
import { SubjectBadge } from "@/components/SubjectBadge";
import { toast } from "@/components/toast";
import type { ClassDetail, TeacherOption } from "@/lib/db/queries/academics";
import { subjectColor } from "@/lib/subjects";
import { timePeriods } from "@/lib/timetable";
import { assignTeachers } from "../actions";

// One row per subject in the session's schedule with a teacher select; the class
// timetable renders underneath from the same data.
export function TeachersCard({ cls, teachers }: { cls: ClassDetail; teachers: TeacherOption[] }) {
  const router = useRouter();
  const subjectsInSchedule = cls.periods.flatMap((p) =>
    p.subjectId ? [{ id: p.subjectId, name: p.subjectName ?? p.subjectId }] : [],
  );
  const unique = subjectsInSchedule.filter(
    (s, i) => subjectsInSchedule.findIndex((t) => t.id === s.id) === i,
  );
  const [chosen, setChosen] = useState<Record<string, number | null>>(
    Object.fromEntries(
      unique.map((s) => [
        s.id,
        cls.assignments.find((a) => a.subjectId === s.id)?.teacherId ?? null,
      ]),
    ),
  );
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const teacherName = (id: number | null) => teachers.find((t) => t.id === id)?.name ?? null;
  const options = teachers
    .filter((t) => t.isActive || Object.values(chosen).includes(t.id))
    .map((t) => ({ value: String(t.id), label: t.name }));

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await assignTeachers({
      classId: cls.id,
      assignments: unique.map((s) => ({ subjectId: s.id, teacherId: chosen[s.id] })),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Teachers saved");
    setDirty(false);
    router.refresh();
  };

  const timed = timePeriods(cls.session.startTime, cls.periods);

  return (
    <Card>
      <CardTitle>Teachers</CardTitle>
      {unique.length === 0 ? (
        <Text c="dimmed" size="sm">
          Add subjects to the {cls.session.name} schedule first.
        </Text>
      ) : (
        <Stack gap="md">
          {cls.clashes.length > 0 && (
            <Alert
              color="saffron"
              variant="light"
              icon={<IconAlertTriangle size={16} stroke={1.75} />}
            >
              {cls.clashes
                .map(
                  (c) =>
                    `${teacherName(c.teacherId)} also teaches ${unique.find((s) => s.id === c.subjectId)?.name} to ${c.className}`,
                )
                .join("; ")}{" "}
              in the same session — they would be in two rooms at once.
            </Alert>
          )}
          <Table>
            <Table.Tbody>
              {unique.map((subject) => (
                <Table.Tr key={subject.id}>
                  <Table.Td w="40%">
                    <SubjectBadge subjectId={subject.id} name={subject.name} size="md" />
                  </Table.Td>
                  <Table.Td>
                    <Select
                      aria-label={`Teacher for ${subject.name}`}
                      data={options}
                      placeholder="Not assigned"
                      clearable
                      searchable
                      value={chosen[subject.id] ? String(chosen[subject.id]) : null}
                      onChange={(v) => {
                        setChosen({ ...chosen, [subject.id]: v ? Number(v) : null });
                        setDirty(true);
                      }}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <FormError message={error} />
          <Group justify="flex-end">
            <Button onClick={save} loading={saving} disabled={!dirty}>
              Save teachers
            </Button>
          </Group>
          <CardTitle>Timetable</CardTitle>
          <Timeline bulletSize={26} lineWidth={2} active={timed.length - 1}>
            {timed.map((p, i) => (
              <Timeline.Item
                key={i}
                color={p.subjectId ? subjectColor(p.subjectId) : "gray"}
                title={
                  <Group gap="xs">
                    <Text fw={600}>{p.startTime}</Text>
                    {p.subjectId ? (
                      <SubjectBadge subjectId={p.subjectId} name={p.subjectName ?? p.subjectId} />
                    ) : (
                      <Text>{p.title}</Text>
                    )}
                  </Group>
                }
              >
                <Text size="sm" c="dimmed">
                  {p.subjectId
                    ? (teacherName(chosen[p.subjectId] ?? null) ?? "No teacher yet")
                    : `until ${p.endTime}`}
                </Text>
              </Timeline.Item>
            ))}
          </Timeline>
        </Stack>
      )}
    </Card>
  );
}
