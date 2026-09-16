"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Button,
  Group,
  Indicator,
  Menu,
  NavLink,
  ThemeIcon,
  Title,
  UnstyledButton,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBell,
  IconBook,
  IconBuildingBank,
  IconCalendar,
  IconCalendarEvent,
  IconChartBar,
  IconCheck,
  IconChevronDown,
  IconClipboardCheck,
  IconFolder,
  IconHome,
  IconInbox,
  IconLayoutDashboard,
  IconLogout,
  IconSchool,
  IconSettings,
  IconUser,
  IconUserPlus,
  IconUsers,
  IconUsersGroup,
  IconSun,
  IconMoon,
  IconDeviceDesktop,
  IconClock,
  type Icon,
} from "@tabler/icons-react";
import type { Area } from "@/lib/current-user";
import classes from "./Shell.module.css";

type NavItem = { label: string; href: string; icon: Icon };

// The four navigation sets (docs/PLAN.md §7, §11).
const nav: Record<Area, NavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/admin", icon: IconLayoutDashboard },
    { label: "Applications", href: "/admin/applications", icon: IconInbox },
    { label: "Students", href: "/admin/students", icon: IconUsers },
    { label: "Guardians", href: "/admin/guardians", icon: IconUsersGroup },
    { label: "Staff", href: "/admin/staff", icon: IconUser },
    { label: "Academics", href: "/admin/academics", icon: IconSchool },
    { label: "Attendance", href: "/admin/attendance", icon: IconClipboardCheck },
    { label: "Fees", href: "/admin/fees", icon: IconBuildingBank },
    { label: "Events", href: "/admin/events", icon: IconCalendarEvent },
    { label: "Resources", href: "/admin/resources", icon: IconFolder },
    { label: "Reports", href: "/admin/reports", icon: IconChartBar },
    { label: "Settings", href: "/admin/settings", icon: IconSettings },
  ],
  teach: [
    { label: "Today", href: "/teach", icon: IconSun },
    { label: "My classes", href: "/teach/classes", icon: IconUsers },
    { label: "Attendance", href: "/teach/attendance", icon: IconClipboardCheck },
    { label: "Homework", href: "/teach/homework", icon: IconBook },
    { label: "Resources", href: "/teach/resources", icon: IconFolder },
    { label: "Calendar", href: "/teach/calendar", icon: IconCalendar },
  ],
  family: [
    { label: "Overview", href: "/family", icon: IconHome },
    { label: "Register a child", href: "/family/register-child", icon: IconUserPlus },
    { label: "Calendar", href: "/family/calendar", icon: IconCalendar },
    { label: "Your account", href: "/family/account", icon: IconUser },
  ],
  student: [
    { label: "Home", href: "/student", icon: IconHome },
    { label: "Timetable", href: "/student/timetable", icon: IconClock },
    { label: "Homework", href: "/student/homework", icon: IconBook },
    { label: "Resources", href: "/student/resources", icon: IconFolder },
    { label: "Calendar", href: "/student/calendar", icon: IconCalendar },
  ],
};

const areaLabel: Record<Area, string> = {
  admin: "Admin",
  teach: "Teacher",
  family: "Family",
  student: "Student",
};

type Props = {
  area: Area;
  schoolName: string;
  user: { name: string };
  // Areas this user can switch between; the switcher shows only when there are several.
  roles: Area[];
  unread?: number;
  children: React.ReactNode;
};

export function Shell({ area, schoolName, user, roles, unread = 0, children }: Props) {
  const pathname = usePathname();
  const [opened, { toggle, close }] = useDisclosure();
  const items = nav[area];
  // Student area: bottom tabs on phones instead of a drawer (§3.1).
  const bottomTabs = area === "student";

  const isActive = (href: string) =>
    href === `/${area}` ? pathname === href : pathname.startsWith(href);

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: bottomTabs || !opened } }}
      footer={bottomTabs ? { height: { base: 64, sm: 0 } } : undefined}
      padding="lg"
    >
      <AppShell.Header px="md">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            {!bottomTabs && (
              <Burger
                opened={opened}
                onClick={toggle}
                hiddenFrom="sm"
                size="sm"
                aria-label="Menu"
              />
            )}
            <ThemeIcon size={36} radius="md">
              <IconSchool size={20} stroke={1.75} />
            </ThemeIcon>
            <Title order={4} visibleFrom="xs">
              {schoolName}
            </Title>
          </Group>
          <Group gap="sm" wrap="nowrap">
            {roles.length > 1 && <RoleSwitcher current={area} roles={roles} />}
            <Indicator
              color="saffron"
              size={16}
              offset={4}
              label={unread > 9 ? "9+" : unread}
              disabled={unread === 0}
            >
              <ActionIcon
                component={Link}
                href={`/${area}/notifications`}
                variant="subtle"
                color="gray"
                size="lg"
                aria-label={unread ? `${unread} unread notifications` : "Notifications"}
              >
                <IconBell size={20} stroke={1.75} />
              </ActionIcon>
            </Indicator>
            <UserMenu name={user.name} />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        {items.map(({ label, href, icon: Icon }) => (
          <NavLink
            key={href}
            component={Link}
            href={href}
            label={label}
            active={isActive(href)}
            leftSection={<Icon size={18} stroke={1.75} />}
            className={classes.navLink}
            onClick={close}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main className={classes.main}>{children}</AppShell.Main>

      {bottomTabs && (
        <AppShell.Footer hiddenFrom="sm">
          <nav className={classes.tabs}>
            {items.map(({ label, href, icon: Icon }) => (
              <UnstyledButton
                key={href}
                component={Link}
                href={href}
                className={classes.tab}
                data-active={isActive(href) || undefined}
              >
                <Icon size={22} stroke={1.75} />
                {label}
              </UnstyledButton>
            ))}
          </nav>
        </AppShell.Footer>
      )}
    </AppShell>
  );
}

function RoleSwitcher({ current, roles }: { current: Area; roles: Area[] }) {
  return (
    <Menu shadow="md" width={160}>
      <Menu.Target>
        <Button variant="default" size="xs" rightSection={<IconChevronDown size={14} />}>
          {areaLabel[current]}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Switch to</Menu.Label>
        {roles.map((role) => (
          <Menu.Item
            key={role}
            component={Link}
            href={`/${role}`}
            leftSection={
              role === current ? <IconCheck size={14} /> : <span style={{ width: 14 }} />
            }
          >
            {areaLabel[role]}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

const schemes = [
  { value: "light", label: "Light", icon: IconSun },
  { value: "dark", label: "Dark", icon: IconMoon },
  { value: "auto", label: "Follow system", icon: IconDeviceDesktop },
] as const;

function UserMenu({ name }: { name: string }) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <UnstyledButton aria-label="Account">
          <Avatar color="tile" radius="xl">
            {initials}
          </Avatar>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{name}</Menu.Label>
        <Menu.Label>Appearance</Menu.Label>
        {schemes.map(({ value, label, icon: Icon }) => (
          <Menu.Item
            key={value}
            leftSection={<Icon size={16} stroke={1.75} />}
            rightSection={colorScheme === value ? <IconCheck size={14} /> : null}
            onClick={() => setColorScheme(value)}
          >
            {label}
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Item
          component="a"
          href="/logout"
          leftSection={<IconLogout size={16} stroke={1.75} />}
        >
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
