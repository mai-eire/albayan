"use client";

import { Badge, Button, Group, Menu, Table, Text } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "@/components/toast";
import type { StaffRow } from "@/lib/db/queries/staff";
import { resendInvite, setAdmin, setTeacherActive } from "./actions";

export function StaffTable({ staff, currentUserId }: { staff: StaffRow[]; currentUserId: number }) {
  const router = useRouter();

  const run = async (result: Promise<{ ok: boolean; error?: string }>, done: string) => {
    const r = await result;
    if (r.ok) {
      toast.success(done);
      router.refresh();
    } else toast.error(r.error ?? "Something went wrong");
  };

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Roles</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {staff.map((person) => (
          <Table.Tr key={person.id}>
            <Table.Td>
              <Text fw={500}>{person.name}</Text>
              <Text size="sm" c="dimmed">
                {person.email}
              </Text>
            </Table.Td>
            <Table.Td>
              <Group gap="xs">
                {person.isAdmin && (
                  <Badge variant="outline" color="gray">
                    Admin
                  </Badge>
                )}
                {person.teacher && (
                  <Badge
                    variant="outline"
                    color="gray"
                    c={person.teacher.isActive ? undefined : "dimmed"}
                  >
                    {person.teacher.isActive ? "Teacher" : "Not teaching"}
                  </Badge>
                )}
              </Group>
            </Table.Td>
            <Table.Td>
              <StatusBadge domain="account" value={person.status} />
            </Table.Td>
            <Table.Td ta="end">
              {(person.status === "invited" || person.teacher || person.id !== currentUserId) && (
                <Menu shadow="md" position="bottom-end">
                  <Menu.Target>
                    <Button
                      variant="subtle"
                      color="gray"
                      size="xs"
                      aria-label={`Actions for ${person.name}`}
                    >
                      <IconDots size={16} stroke={1.75} />
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {person.status === "invited" && (
                      <Menu.Item
                        onClick={() =>
                          run(resendInvite({ userId: person.id }), `Invite sent to ${person.email}`)
                        }
                      >
                        Resend invite
                      </Menu.Item>
                    )}
                    {person.teacher && (
                      <Menu.Item
                        onClick={() =>
                          run(
                            setTeacherActive({
                              teacherId: person.teacher!.id,
                              isActive: !person.teacher!.isActive,
                            }),
                            person.teacher!.isActive
                              ? `${person.name} no longer teaches`
                              : `${person.name} is teaching again`,
                          )
                        }
                      >
                        {person.teacher.isActive ? "Stop teaching" : "Teaching again"}
                      </Menu.Item>
                    )}
                    {person.id !== currentUserId && (
                      <Menu.Item
                        onClick={() =>
                          run(
                            setAdmin({ userId: person.id, isAdmin: !person.isAdmin }),
                            person.isAdmin
                              ? `${person.name} is no longer an admin`
                              : `${person.name} is now an admin`,
                          )
                        }
                      >
                        {person.isAdmin ? "Remove admin access" : "Make admin"}
                      </Menu.Item>
                    )}
                  </Menu.Dropdown>
                </Menu>
              )}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
