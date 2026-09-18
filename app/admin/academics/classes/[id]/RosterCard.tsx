"use client";

import { Button, Card, Menu, Table, Text } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import { useState } from "react";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import tabular from "@/components/tabular.module.css";
import { ageOn } from "@/lib/age";
import type { RosterForAdmin } from "@/lib/db/queries/academics";
import type { AttendanceSummary } from "@/lib/db/queries/attendance";
import type { FamilyMember } from "@/lib/db/queries/families";
import { MoveStudentModal, type ClassChoice } from "../MoveStudentModal";

type Props = {
  roster: RosterForAdmin[];
  attendance: AttendanceSummary[];
  // Registers actually taken this term: the "n" in "7 / 9".
  registersTaken: number;
  periodLabel: string | null;
  current: ClassChoice;
  otherClasses: ClassChoice[];
  capacity: number | null;
  // Each student's brothers and sisters, keyed by student id, for the move modal.
  families: Record<number, FamilyMember[]>;
  today: string;
};

// The class's students with this term's attendance as "x / n" per status; each row can be
// moved to another class of the year.
export function RosterCard({
  roster,
  attendance,
  registersTaken,
  periodLabel,
  current,
  otherClasses,
  capacity,
  families,
  today,
}: Props) {
  const [moving, setMoving] = useState<RosterForAdmin | null>(null);
  const counts = new Map(attendance.map((a) => [a.studentId, a]));
  const cell = (n: number | undefined, color?: string) => (
    <Table.Td ta="end" className={tabular.tabular}>
      <Text component="span" c={n ? color : "dimmed"} fw={n ? 500 : undefined}>
        {n ?? 0}
      </Text>
      <Text component="span" c="dimmed">
        {" "}
        / {registersTaken}
      </Text>
    </Table.Td>
  );

  return (
    <Card>
      <CardTitle
        context={
          periodLabel && (
            <Text size="sm" c="dimmed">
              {periodLabel} · {registersTaken} {registersTaken === 1 ? "register" : "registers"}{" "}
              taken
            </Text>
          )
        }
      >
        Students
        <Text
          component="span"
          c={capacity !== null && roster.length > capacity ? "clay" : "dimmed"}
          fw={400}
        >
          {" "}
          {roster.length}
          {capacity !== null && ` / ${capacity}`}
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
              <Table.Th ta="end">Age</Table.Th>
              <Table.Th ta="end">Present</Table.Th>
              <Table.Th ta="end">Late</Table.Th>
              <Table.Th ta="end">Absent</Table.Th>
              <Table.Th ta="end">Excused</Table.Th>
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
                  <Table.Td ta="end">{ageOn(s.dateOfBirth, today)}</Table.Td>
                  {cell(a?.present, "tile")}
                  {cell(a?.late, "saffron")}
                  {cell(a?.absent, "clay")}
                  {cell(a?.excused)}
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
                          <Menu.Item onClick={() => setMoving(s)}>Move to another class</Menu.Item>
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
      <MoveStudentModal
        student={moving && { enrolmentId: moving.enrolmentId, firstName: moving.firstName }}
        current={current}
        options={otherClasses}
        family={moving ? families[moving.studentId] : []}
        onClose={() => setMoving(null)}
      />
    </Card>
  );
}
