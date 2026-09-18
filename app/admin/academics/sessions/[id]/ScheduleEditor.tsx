"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
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
import { IconGripVertical, IconPlus, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CardTitle } from "@/components/CardTitle";
import { FormError } from "@/components/FormError";
import { SubjectBadge } from "@/components/SubjectBadge";
import { toast } from "@/components/toast";
import type { Subject } from "@/lib/db/queries/academics";
import { subjectColor } from "@/lib/subjects";
import { sessionEndTime, timePeriods, type PeriodInput } from "@/lib/timetable";
import { saveSchedule } from "../actions";
import classes from "./ScheduleEditor.module.css";

const breakValue = "__break";
const otherValue = "__other";
const staffValue = "__staff";
const breakTitle = "Break";

type Props = { sessionId: number; startTime: string; periods: PeriodInput[]; subjects: Subject[] };

// Which picker entry a stored period is: its subject, "Break", "Other" or "Staff only".
function kindOf(p: PeriodInput) {
  if (p.subjectId) return p.subjectId;
  if (p.staffOnly) return staffValue;
  return p.title === breakTitle ? breakValue : otherValue;
}

// A period with a key that survives reordering, so drag-and-drop can follow it.
type Row = PeriodInput & { key: number };

// Ordered periods with durations; the timeline on the side is computed live. No times
// typed; rows reorder by their handle.
export function ScheduleEditor({ sessionId, startTime, periods: initial, subjects }: Props) {
  const router = useRouter();
  const nextKey = useRef(initial.length);
  const [periods, setPeriods] = useState<Row[]>(initial.map((p, key) => ({ ...p, key })));
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (next: Row[]) => {
    setPeriods(next);
    setDirty(true);
  };
  const row = (p: PeriodInput): Row => ({ ...p, key: nextKey.current++ });
  const set = (i: number, patch: Partial<PeriodInput>) =>
    update(periods.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const reorder = ({ source, destination }: DropResult) => {
    if (!destination || destination.index === source.index) return;
    const next = [...periods];
    const [item] = next.splice(source.index, 1);
    next.splice(destination.index, 0, item);
    update(next);
  };
  const add = () => {
    const unused = subjects.find((s) => !periods.some((p) => p.subjectId === s.id));
    update([
      ...periods,
      row(
        unused
          ? { subjectId: unused.id, title: null, durationMinutes: 50 }
          : { subjectId: null, title: breakTitle, durationMinutes: 15 },
      ),
    ]);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await saveSchedule({
      sessionId,
      periods: periods.map(({ key: _key, ...p }) => (void _key, p)),
    });
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
    { group: "Subjects", items: subjects.map((s) => ({ value: s.id, label: s.name })) },
    {
      group: "Slots",
      items: [
        { value: breakValue, label: breakTitle },
        { value: otherValue, label: "Other…" },
        { value: staffValue, label: "Staff only…" },
      ],
    },
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
          <DragDropContext onDragEnd={reorder}>
            <Droppable droppableId="periods">
              {(drop) => (
                <Stack gap="sm" ref={drop.innerRef} {...drop.droppableProps}>
                  {periods.map((period, i) => {
                    const kind = kindOf(period);
                    return (
                      <Draggable key={period.key} draggableId={String(period.key)} index={i}>
                        {(drag, snapshot) => (
                          <Group
                            gap="xs"
                            wrap="nowrap"
                            align="center"
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            className={classes.row}
                            data-dragging={snapshot.isDragging || undefined}
                          >
                            <div
                              {...drag.dragHandleProps}
                              className={classes.handle}
                              aria-label={`Drag to move period ${i + 1}`}
                            >
                              <IconGripVertical size={18} stroke={1.5} />
                            </div>
                            <Select
                              aria-label={`Period ${i + 1}`}
                              data={options}
                              value={kind}
                              allowDeselect={false}
                              w={kind === otherValue || kind === staffValue ? 140 : undefined}
                              style={
                                kind === otherValue || kind === staffValue ? undefined : { flex: 1 }
                              }
                              onChange={(v) =>
                                set(
                                  i,
                                  v === breakValue
                                    ? { subjectId: null, title: breakTitle, staffOnly: false }
                                    : v === otherValue
                                      ? { subjectId: null, title: "", staffOnly: false }
                                      : v === staffValue
                                        ? { subjectId: null, title: "", staffOnly: true }
                                        : { subjectId: v, title: null, staffOnly: false },
                                )
                              }
                            />
                            {(kind === otherValue || kind === staffValue) && (
                              <TextInput
                                aria-label={`Title of period ${i + 1}`}
                                placeholder={kind === staffValue ? "Staff meeting" : "Assembly"}
                                value={period.title ?? ""}
                                autoFocus={!period.title}
                                onChange={(e) => set(i, { title: e.currentTarget.value })}
                                style={{ flex: 1 }}
                              />
                            )}
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
                              color="clay"
                              aria-label="Remove period"
                              onClick={() => update(periods.filter((_, j) => j !== i))}
                            >
                              <IconTrash size={16} stroke={1.75} />
                            </ActionIcon>
                          </Group>
                        )}
                      </Draggable>
                    );
                  })}
                  {drop.placeholder}
                </Stack>
              )}
            </Droppable>
          </DragDropContext>
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
                    <Text c={p.staffOnly ? "dimmed" : undefined}>
                      {p.title || "Untitled"}
                      {p.staffOnly && " · staff only"}
                    </Text>
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
