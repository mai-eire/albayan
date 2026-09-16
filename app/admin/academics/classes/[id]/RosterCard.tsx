"use client";

import { Button, Card, Group, Menu, Modal, Select, Stack, Table, Text } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import { ageOn } from "@/lib/age";
import type { RosterForAdmin } from "@/lib/db/queries/academics";
import type { AttendanceSummary } from "@/lib/db/queries/attendance";
import { moveStudent } from "../actions";

type Props = {
  roster: RosterForAdmin[];
  attendance: AttendanceSummary[];
  periodLabel: string | null;
  otherClasses: { id: number; name: string; sessionName: string }[];
  today: string;
};

// The class's students with this term's attendance counts; each row can be moved to
// another class of the year.
export function RosterCard({ roster, attendance, periodLabel, otherClasses, today }: Props) {
  const router = useRouter();
  const [moving, setMoving] = useState<RosterForAdmin | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const counts = new Map(attendance.map((a) => [a.studentId, a]));

  const move = async () => {
    if (!moving || !target) return;
    setSaving(true);
    setError(null);
    const result = await moveStudent({ enrolmentId: moving.enrolmentId, classId: Number(target) });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(`${moving.firstName} moved`);
    setMoving(null);
    router.refresh();
  };

  return (
    <Card>
      <CardTitle
        context={
          periodLabel && (
            <Text size="sm" c="dimmed">
              Attendance · {periodLabel}
            </Text>
          )
        }
      >
        Students
        <Text component="span" c="dimmed" fw={400}>
          {" "}
          {roster.length}
        </Text>
      </CardTitle>
      {roster.length === 0 ? (
        <Text size="sm" c="dimmed">
          Nobody is placed in this class yet. Approving an application puts a child here.
        </Text>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Student</Table.Th>
              <Table.Th>Age</Table.Th>
              <Table.Th>Present</Table.Th>
              <Table.Th>Absent</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {roster.map((s) => {
              const a = counts.get(s.studentId);
              return (
                <Table.Tr key={s.enrolmentId}>
                  <Table.Td>
                    <AppLink href={`/admin/students/${s.studentId}`} fw={500}>
                      {s.firstName} {s.lastName}
                    </AppLink>
                    <Text size="sm" c="dimmed">
                      {s.studentCode}
                    </Text>
                  </Table.Td>
                  <Table.Td>{ageOn(s.dateOfBirth, today)}</Table.Td>
                  <Table.Td>{(a?.present ?? 0) + (a?.late ?? 0)}</Table.Td>
                  <Table.Td c={a?.absent ? "clay" : undefined}>{a?.absent ?? 0}</Table.Td>
                  <Table.Td ta="end">
                    {otherClasses.length > 0 && (
                      <Menu shadow="md" position="bottom-end">
                        <Menu.Target>
                          <Button
                            variant="subtle"
                            color="gray"
                            size="xs"
                            aria-label={`Actions for ${s.firstName}`}
                          >
                            <IconDots size={16} stroke={1.75} />
                          </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            onClick={() => {
                              setMoving(s);
                              setTarget(String(otherClasses[0].id));
                              setError(null);
                            }}
                          >
                            Move to another class
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
      <Modal
        opened={moving !== null}
        onClose={() => setMoving(null)}
        title={moving ? `Move ${moving.firstName}` : ""}
      >
        <Stack gap="md">
          <Select
            label="New class"
            data={otherClasses.map((c) => ({
              value: String(c.id),
              label: `${c.name} · ${c.sessionName}`,
            }))}
            value={target}
            onChange={setTarget}
            allowDeselect={false}
          />
          <Text size="sm" c="dimmed">
            Their place here ends today and the new one starts today, keeping the same fee. The
            family sees the new class straight away.
          </Text>
          <FormError message={error} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setMoving(null)}>
              Cancel
            </Button>
            <Button onClick={move} loading={saving}>
              Move student
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
