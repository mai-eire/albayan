import { useState } from "react";
import {
  ActionIcon, AppShell, Avatar, Badge, Box, Burger, Button, Card, Divider, Group, Indicator, Menu, Modal,
  NavLink, SegmentedControl, Select, SimpleGrid, Stack, Table, Text, Textarea, TextInput, ThemeIcon, Timeline,
  Title, Tooltip, UnstyledButton,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle, IconBell, IconBook, IconCalendar, IconCheck, IconChevronDown, IconClipboardCheck, IconClock,
  IconFolder, IconNotes, IconPlus, IconSchool, IconSun, IconUpload, IconUsers,
} from "@tabler/icons-react";
import {
  classOptions, gregorian, hijri, homeworkDue, lessons, nowIndex, stats, students, subjectColor, subjectOptions,
  teacher, type Status,
} from "./data";

const nav = [
  { label: "Today", icon: IconSun, active: true },
  { label: "My classes", icon: IconUsers },
  { label: "Attendance", icon: IconClipboardCheck },
  { label: "Homework", icon: IconBook },
  { label: "Resources", icon: IconFolder },
  { label: "Calendar", icon: IconCalendar },
];

export default function App() {
  const [navOpened, { toggle }] = useDisclosure();
  const [homeworkOpen, homework] = useDisclosure(false);

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: !navOpened } }}
      padding="lg"
      style={{ background: "#f4f8f6" }}
    >
      <AppShell.Header px="md" style={{ background: "#fff" }}>
        <Group h="100%" justify="space-between">
          <Group gap="sm">
            <Burger opened={navOpened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <ThemeIcon variant="filled" size={36} radius="md">
              <IconSchool size={20} />
            </ThemeIcon>
            <Title order={4} fw={800}>Al-Bayan</Title>
          </Group>
          <Group gap="sm">
            <RoleSwitcher />
            <Indicator color="saffron" size={8} offset={4}>
              <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Notifications">
                <IconBell size={20} />
              </ActionIcon>
            </Indicator>
            <Avatar color="tile" radius="xl">{teacher.initials}</Avatar>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" style={{ background: "#fff" }}>
        {nav.map(({ label, icon: Icon, active }) => (
          <NavLink key={label} label={label} active={active} leftSection={<Icon size={18} />} variant="light" style={{ borderRadius: 8 }} />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack gap="lg" maw={1180} mx="auto">
          <Group justify="space-between" align="flex-end" wrap="wrap">
            <div>
              <Text c="dimmed" size="sm" fw={500}>{gregorian} · {hijri}</Text>
              <Title order={1} fw={800} style={{ fontSize: "2rem", letterSpacing: "-0.02em" }}>
                Good morning, {teacher.name.split(" ")[0]}
              </Title>
            </div>
            <Group gap="xs">
              <Button leftSection={<IconClipboardCheck size={16} />}>Take register</Button>
              <Button variant="light" leftSection={<IconPlus size={16} />} onClick={homework.open}>Add homework</Button>
            </Group>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {stats.map((s) => (
              <Card key={s.label}>
                <Text size="sm" c="dimmed" fw={500}>{s.label}</Text>
                <Text fw={800} style={{ fontSize: "2.25rem", fontFamily: "'Bricolage Grotesque'", lineHeight: 1.1 }}>{s.value}</Text>
                <Text size="xs" c="dimmed">{s.hint}</Text>
              </Card>
            ))}
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <Stack gap="md" style={{ gridColumn: "span 2" }}>
              <LessonsCard />
              <RegisterCard />
            </Stack>
            <Stack gap="md">
              <HomeworkDueCard />
              <QuickActionsCard onAddHomework={homework.open} />
            </Stack>
          </SimpleGrid>
        </Stack>
      </AppShell.Main>

      <AddHomeworkModal opened={homeworkOpen} onClose={homework.close} />
    </AppShell>
  );
}

function RoleSwitcher() {
  return (
    <Menu shadow="md" width={160}>
      <Menu.Target>
        <Button variant="default" size="xs" rightSection={<IconChevronDown size={14} />}>Teacher</Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Switch to</Menu.Label>
        {teacher.roles.map((r) => <Menu.Item key={r} leftSection={r === "Teacher" ? <IconCheck size={14} /> : null}>{r}</Menu.Item>)}
      </Menu.Dropdown>
    </Menu>
  );
}

function LessonsCard() {
  return (
    <Card>
      <Group justify="space-between" mb="md">
        <Title order={3}>Today's lessons</Title>
        <Badge variant="light" color="gray" leftSection={<IconClock size={12} />}>Saturday session</Badge>
      </Group>
      <Timeline active={nowIndex} bulletSize={26} lineWidth={2} color="saffron">
        {lessons.map((l, i) => {
          const isBreak = l.subject === "Break";
          const isNow = i === nowIndex;
          return (
            <Timeline.Item
              key={i}
              bullet={isNow ? <IconSun size={14} /> : undefined}
              title={
                <Group gap="xs">
                  <Text fw={600} c={isBreak ? "dimmed" : undefined}>{l.subject}</Text>
                  {!isBreak && <Badge size="sm" variant="light" color={subjectColor[l.subject]}>{l.className}</Badge>}
                  {isNow && <Badge size="sm" color="saffron" variant="filled">Now</Badge>}
                </Group>
              }
            >
              <Text size="sm" c="dimmed" style={{ fontVariantNumeric: "tabular-nums" }}>
                {l.start}–{l.end}{l.room && ` · ${l.room}`}
              </Text>
              {l.registerDue && <Button size="compact-xs" variant="subtle" mt={4} leftSection={<IconClipboardCheck size={12} />}>Register not taken</Button>}
            </Timeline.Item>
          );
        })}
      </Timeline>
    </Card>
  );
}

function RegisterCard() {
  const [rows, setRows] = useState(students);
  const set = (id: number, status: Status) => setRows((r) => r.map((s) => (s.id === id ? { ...s, status } : s)));
  const counts = rows.reduce((a, s) => ({ ...a, [s.status]: (a[s.status] ?? 0) + 1 }), {} as Record<Status, number>);

  return (
    <Card>
      <Group justify="space-between" mb="md" wrap="wrap">
        <div>
          <Title order={3}>Register · Level 2</Title>
          <Text size="sm" c="dimmed">Saturday 19 September · 8 students</Text>
        </div>
        <Group gap="xs">
          <Badge color="tile" variant="light">{counts.present ?? 0} present</Badge>
          <Badge color="saffron" variant="light">{counts.late ?? 0} late</Badge>
          <Badge color="clay" variant="light">{counts.absent ?? 0} absent</Badge>
        </Group>
      </Group>
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Student</Table.Th>
            <Table.Th>Age</Table.Th>
            <Table.Th ta="right">Attendance</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((s) => (
            <Table.Tr key={s.id}>
              <Table.Td>
                <Group gap="sm">
                  <Avatar size="sm" radius="xl" color={s.status === "absent" ? "gray" : "tile"}>{s.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</Avatar>
                  <Text fw={500}>{s.name}</Text>
                  {s.allergy && (
                    <Tooltip label={s.allergy}>
                      <ThemeIcon size="sm" variant="light" color="clay" radius="xl"><IconAlertCircle size={12} /></ThemeIcon>
                    </Tooltip>
                  )}
                </Group>
              </Table.Td>
              <Table.Td style={{ fontVariantNumeric: "tabular-nums" }}>{s.age}</Table.Td>
              <Table.Td ta="right">
                <SegmentedControl
                  size="xs"
                  value={s.status}
                  onChange={(v) => set(s.id, v as Status)}
                  color={s.status === "present" ? "tile" : s.status === "late" ? "saffron" : "clay"}
                  data={[{ label: "Present", value: "present" }, { label: "Late", value: "late" }, { label: "Absent", value: "absent" }]}
                />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Divider my="md" />
      <Group justify="flex-end">
        <Button variant="default">Save draft</Button>
        <Button leftSection={<IconCheck size={16} />}>Submit register</Button>
      </Group>
    </Card>
  );
}

function HomeworkDueCard() {
  return (
    <Card>
      <Title order={3} mb="md">Homework due today</Title>
      <Stack gap="sm">
        {homeworkDue.map((h, i) => (
          <UnstyledButton key={i} p="sm" style={{ borderRadius: 10, background: "#f4f8f6" }}>
            <Group gap="xs" mb={4}>
              <Badge size="xs" variant="filled" color={subjectColor[h.subject]}>{h.subject}</Badge>
              <Text size="xs" c="dimmed">{h.className}</Text>
            </Group>
            <Text size="sm" fw={500} lineClamp={2}>{h.title}</Text>
          </UnstyledButton>
        ))}
      </Stack>
    </Card>
  );
}

function QuickActionsCard({ onAddHomework }: { onAddHomework: () => void }) {
  const actions = [
    { label: "Take register", icon: IconClipboardCheck, color: "tile" },
    { label: "Add homework", icon: IconBook, color: "lapis", onClick: onAddHomework },
    { label: "Add a note", icon: IconNotes, color: "plum" },
    { label: "Share a resource", icon: IconUpload, color: "saffron" },
  ];
  return (
    <Card>
      <Title order={3} mb="md">Quick actions</Title>
      <SimpleGrid cols={2} spacing="sm">
        {actions.map(({ label, icon: Icon, color, onClick }) => (
          <UnstyledButton key={label} onClick={onClick} p="md" style={{ borderRadius: 12, border: "1px solid var(--mantine-color-gray-3)", textAlign: "center" }}>
            <ThemeIcon variant="light" color={color} size={40} radius="md" mx="auto" mb={8}><Icon size={20} /></ThemeIcon>
            <Text size="sm" fw={600}>{label}</Text>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Card>
  );
}

function AddHomeworkModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const [due, setDue] = useState<Date | null>(new Date(2026, 8, 26));
  return (
    <Modal opened={opened} onClose={onClose} title={<Title order={3}>Add homework</Title>} radius="lg" size="md">
      <Stack gap="md">
        <Group grow>
          <Select label="Class" data={classOptions} defaultValue={classOptions[0]} allowDeselect={false} />
          <Select label="Subject" data={subjectOptions} defaultValue="Quran" allowDeselect={false} />
        </Group>
        <TextInput label="Title" placeholder="e.g. Memorise Surah Al-Fil, verses 1–5" />
        <Textarea label="Details" placeholder="What should students do, and how will you check it?" minRows={3} autosize />
        <DateInput label="Due date" value={due} onChange={(v) => setDue(v ? new Date(v) : null)} valueFormat="ddd D MMM YYYY" />
        <Box>
          <Text size="xs" c="dimmed">Parents and students of Level 2 will be notified when you publish.</Text>
        </Box>
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button onClick={onClose}>Publish homework</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
