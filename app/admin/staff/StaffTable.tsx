"use client";

import { Badge, Button, Group, Menu, Select, Stack, Switch, Table, Text } from "@mantine/core";
import { IconDots, IconUser } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { AppLink } from "@/components/AppLink";
import { Nothing } from "@/components/Nothing";
import { ClassFilter, type ClassFilterOption } from "@/components/ClassFilter";
import { confirmDestructive } from "@/components/confirm";
import { EmptyState } from "@/components/EmptyState";
import { SortableTh, useSort } from "@/components/SortableTh";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "@/components/toast";
import { useUrlFilters } from "@/components/useUrlFilters";
import type { StaffRow } from "@/lib/db/queries/staff";
import { formatDate } from "@/lib/time";
import { deleteInvite, resendInvite, setAdmin, setTeacherActive } from "./actions";
import { applyStaffFilters, parseStaffFilters } from "./filters";

type Key = "name" | "email" | "signin";

type Props = {
  staff: StaffRow[];
  sessions: { id: number; name: string }[];
  classes: ClassFilterOption[];
  subjects: { id: string; name: string }[];
  currentUserId: number;
  timezone: string;
};

// Filters above ("everyone teaching Quran", "everyone on Saturday"), one line per person
// below; former teachers hidden unless asked. Everything happens in the browser.
export function StaffTable({ staff, sessions, classes, subjects, currentUserId, timezone }: Props) {
  const router = useRouter();
  const { params, set, query } = useUrlFilters();
  const filters = parseStaffFilters(query);
  const shown = applyStaffFilters(staff, filters);
  const session = params.get("session");
  const former = staff.filter((s) => s.teacher && !s.teacher.isActive && !s.isAdmin).length;
  const { sort, toggle, sorted } = useSort<Key, StaffRow>(
    shown,
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
    <>
      <Group gap="sm" wrap="wrap">
        <Select
          aria-label="Session"
          placeholder="Any session"
          data={sessions.map((s) => ({ value: String(s.id), label: s.name }))}
          value={session}
          clearable
          onChange={(v) => set({ session: v, class: null })}
          w={150}
        />
        <ClassFilter
          classes={classes}
          sessionId={session}
          value={params.get("class")}
          onChange={(v) => set({ class: v })}
        />
        <Select
          aria-label="Subject"
          placeholder="Any subject"
          data={subjects.map((s) => ({ value: s.id, label: s.name }))}
          value={params.get("subject")}
          clearable
          onChange={(v) => set({ subject: v })}
          w={160}
        />
        {former > 0 && (
          <Switch
            label="Show former teachers"
            checked={filters.showFormer}
            onChange={(e) => set({ show: e.currentTarget.checked ? "all" : null })}
          />
        )}
        <Text size="sm" c="dimmed" ms="auto">
          {shown.length} {shown.length === 1 ? "person" : "people"}
        </Text>
      </Group>
      {shown.length === 0 ? (
        <EmptyState
          icon={<IconUser size={20} stroke={1.75} />}
          message="Nobody matches. Try clearing a filter."
        />
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <SortableTh label="Name" sortKey="name" sort={sort} onSort={toggle} />
              <SortableTh label="Email" sortKey="email" sort={sort} onSort={toggle} />
              <Table.Th>Phone</Table.Th>
              <Table.Th>Roles</Table.Th>
              <Table.Th>Classes</Table.Th>
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
                <Table.Td>{person.phone ?? <Nothing>no phone</Nothing>}</Table.Td>
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
                  {person.classes.length ? (
                    <Stack gap={2}>
                      {[...person.classes]
                        .sort((a, b) =>
                          `${a.name} ${a.sessionName}`.localeCompare(`${b.name} ${b.sessionName}`),
                        )
                        .map((c) => (
                          <AppLink key={c.id} href={`/admin/academics/classes/${c.id}`} size="sm">
                            {c.name} · {c.sessionName}
                          </AppLink>
                        ))}
                    </Stack>
                  ) : (
                    <Nothing>no classes</Nothing>
                  )}
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
                  {(person.status === "invited" ||
                    person.teacher ||
                    person.id !== currentUserId) && (
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
                              run(
                                resendInvite({ userId: person.id }),
                                `Invite sent to ${person.email}`,
                              )
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
      )}
    </>
  );
}
