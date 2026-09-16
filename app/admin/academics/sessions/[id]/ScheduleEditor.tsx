"use client";

import {
  ActionIcon,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Timeline,
} from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CardTitle } from "@/components/CardTitle";
import { FormError } from "@/components/FormError";
import { SubjectBadge } from "@/components/SubjectBadge";
import { toast } from "@/components/toast";
import type { Subject } from "@/lib/db/queries/academics";
import { subjectColor } from "@/lib/subjects";
import { sessionEndTime, timePeriods, type PeriodInput } from "@/lib/timetable";
import { saveSchedule } from "../actions";

const breakValue = "__break";

type Props = { sessionId: number; startTime: string; periods: PeriodInput[]; subjects: Subject[] };

// Ordered periods with durations; the timeline on the side is computed live. No times typed.
export function ScheduleEditor({ sessionId, startTime, periods: initial, subjects }: Props) {
  const router = useRouter();
  const [periods, setPeriods] = useState<PeriodInput[]>(initial);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (next: PeriodInput[]) => {
    setPeriods(next);
    setDirty(true);
  };
  const set = (i: number, patch: Partial<PeriodInput>) =>
    update(periods.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...periods];
    const [item] = next.splice(i, 1);
    next.splice(i + dir, 0, item);
    update(next);
  };
  const add = () => {
    const unused = subjects.find((s) => !periods.some((p) => p.subjectId === s.id));
    update([
      ...periods,
      unused
        ? { subjectId: unused.id, title: null, durationMinutes: 50 }
        : { subjectId: null, title: "Break", durationMinutes: 15 },
    ]);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await saveSchedule({ sessionId, periods });
    setSaving(false);
    if (!result.ok) {
      setError(result.fieldErrors ? Object.values(result.fieldErrors)[0] : result.error);
      return;
    }
    toast.success("Schedule saved");
    setDirty(false);
    router.refresh();
  };

  const timed = timePeriods(startTime, periods);
  const subjectName = (id: string | null) => subjects.find((s) => s.id === id)?.name ?? id ?? "";
  const options = [
    ...subjects.map((s) => ({ value: s.id, label: s.name })),
    { value: breakValue, label: "Break or other" },
  ];

  return (
    <Card>
      <CardTitle
        context={
          <Text size="sm" c="dimmed">
            {startTime}–{sessionEndTime(startTime, periods)}
          </Text>
        }
      >
        Schedule
      </CardTitle>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Stack gap="sm">
          {periods.map((period, i) => (
            <Group key={i} gap="xs" wrap="nowrap" align="flex-start">
              <Stack gap={4} style={{ flex: 1 }}>
                <Select
                  aria-label={`Period ${i + 1}`}
                  data={options}
                  value={period.subjectId ?? breakValue}
                  allowDeselect={false}
                  onChange={(v) =>
                    set(
                      i,
                      v === breakValue
                        ? { subjectId: null, title: period.title || "Break" }
                        : { subjectId: v, title: null },
                    )
                  }
                />
                {!period.subjectId && (
                  <TextInput
                    aria-label={`Title of period ${i + 1}`}
                    placeholder="Break"
                    value={period.title ?? ""}
                    onChange={(e) => set(i, { title: e.currentTarget.value })}
                  />
                )}
              </Stack>
              <NumberInput
                aria-label={`Minutes for period ${i + 1}`}
                value={period.durationMinutes}
                onChange={(v) => set(i, { durationMinutes: Number(v) || 0 })}
                min={5}
                max={240}
                step={5}
                suffix=" min"
                w={110}
              />
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <IconArrowUp size={16} stroke={1.75} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Move down"
                disabled={i === periods.length - 1}
                onClick={() => move(i, 1)}
              >
                <IconArrowDown size={16} stroke={1.75} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="clay"
                aria-label="Remove period"
                onClick={() => update(periods.filter((_, j) => j !== i))}
              >
                <IconTrash size={16} stroke={1.75} />
              </ActionIcon>
            </Group>
          ))}
          <Group justify="space-between">
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconPlus size={16} stroke={1.75} />}
              onClick={add}
            >
              Add period
            </Button>
            <Button onClick={save} loading={saving} disabled={!dirty}>
              Save schedule
            </Button>
          </Group>
          <FormError message={error} />
        </Stack>
        <Timeline bulletSize={26} lineWidth={2} active={timed.length - 1}>
          {timed.map((p, i) => (
            <Timeline.Item
              key={i}
              color={p.subjectId ? subjectColor(p.subjectId) : "gray"}
              title={
                <Group gap="xs">
                  <Text fw={600}>{p.startTime}</Text>
                  {p.subjectId ? (
                    <SubjectBadge subjectId={p.subjectId} name={subjectName(p.subjectId)} />
                  ) : (
                    <Text>{p.title}</Text>
                  )}
                </Group>
              }
            >
              <Text size="sm" c="dimmed">
                until {p.endTime} · {p.durationMinutes} min
              </Text>
            </Timeline.Item>
          ))}
        </Timeline>
      </SimpleGrid>
    </Card>
  );
}
