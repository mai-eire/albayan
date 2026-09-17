"use client";

import { Badge, Button, Group, Menu, Table, Text } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { AppLink } from "@/components/AppLink";
import { confirmDestructive } from "@/components/confirm";
import { SortableTh, useSort } from "@/components/SortableTh";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "@/components/toast";
import type { StaffRow } from "@/lib/db/queries/staff";
import { formatDate } from "@/lib/time";
import { deleteInvite, resendInvite, setAdmin, setTeacherActive } from "./actions";

type Key = "name" | "email" | "signin";

export function StaffTable({
  staff,
  currentUserId,
  timezone,
}: {
  staff: StaffRow[];
  currentUserId: number;
  timezone: string;
}) {
  const router = useRouter();
  const { sort, toggle, sorted } = useSort<Key, StaffRow>(
    staff,
    (s, key) => (key === "name" ? s.name : key === "email" ? s.email : s.lastSignInAt),
    { key: "name", direction: "asc" },
  );

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
          <SortableTh label="Name" sortKey="name" sort={sort} onSort={toggle} />
          <SortableTh label="Email" sortKey="email" sort={sort} onSort={toggle} />
          <Table.Th>Phone</Table.Th>
          <Table.Th>Roles</Table.Th>
          <Table.Th>Account</Table.Th>
          <SortableTh label="Last sign-in" sortKey="signin" sort={sort} onSort={toggle} />
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {sorted.map((person) => (
          <Table.Tr key={person.id}>
            <Table.Td>
              <AppLink href={`/admin/staff/${person.id}`} fw={500}>
                {person.name}
              </AppLink>
            </Table.Td>
            <Table.Td>
              <Text component="span" c="dimmed">
                {person.email}
              </Text>
            </Table.Td>
            <Table.Td>{person.phone ?? "—"}</Table.Td>
            <Table.Td>
              <Group gap="xs" wrap="nowrap">
                {person.isAdmin && (
                  <Badge variant="outline" color="gray">
                    Admin
                  </Badge>
                )}
                {person.teacher &&
                  (person.teacher.isActive ? (
                    <Badge variant="outline" color="gray">
                      Teacher
                    </Badge>
                  ) : (
                    <Text size="sm" c="dimmed">
                      Stopped teaching
                      {person.teacher.deactivatedAt &&
                        ` ${formatDate(person.teacher.deactivatedAt, timezone, true)}`}
                    </Text>
                  ))}
              </Group>
            </Table.Td>
            <Table.Td>
              <StatusBadge domain="account" value={person.status} />
            </Table.Td>
            <Table.Td>
              {person.lastSignInAt ? (
                formatDate(person.lastSignInAt, timezone, true)
              ) : (
                <Text component="span" c="dimmed">
                  Never
                </Text>
              )}
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
                    {person.status === "invited" && (
                      <Menu.Item
                        color="clay"
                        onClick={() =>
                          confirmDestructive({
                            title: "Delete this invite?",
                            message: `${person.name} (${person.email}) never set up their account. The invite and their entry are removed. This cannot be undone.`,
                            confirmLabel: "Delete invite",
                            onConfirm: () =>
                              run(deleteInvite({ userId: person.id }), "Invite deleted"),
                          })
                        }
                      >
                        Delete invite
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
