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
  Menu,
  NavLink,
  ThemeIcon,
  Title,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import {
  IconBook,
  IconBook2,
  IconBuildingBank,
  IconCalendar,
  IconCalendarTime,
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
  IconClock,
  type Icon,
} from "@tabler/icons-react";
import type { Area } from "@/lib/current-user";
import type { NotificationRow } from "@/lib/db/queries/notifications";
import { DevClock } from "./DevClock";
import { NotificationBell } from "./NotificationBell";
import classes from "./Shell.module.css";

type NavItem = {
  label: string;
  href: string;
  icon: Icon;
  // Sub-pages shown nested under the item, open while any of them is current.
  children?: { label: string; href: string }[];
};

// The four navigation sets (docs/PLAN.md §7, §11).
const nav: Record<Area, NavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/admin", icon: IconLayoutDashboard },
    { label: "Applications", href: "/admin/applications", icon: IconInbox },
    { label: "Students", href: "/admin/students", icon: IconUsers },
    { label: "Families", href: "/admin/guardians", icon: IconUsersGroup },
    { label: "Staff", href: "/admin/staff", icon: IconUser },
    {
      label: "Academics",
      href: "/admin/academics",
      icon: IconSchool,
      children: [
        { label: "Years & terms", href: "/admin/academics/years" },
        { label: "Subjects", href: "/admin/academics/subjects" },
        { label: "Sessions", href: "/admin/academics/sessions" },
        { label: "Classes", href: "/admin/academics/classes" },
      ],
    },
    { label: "Attendance", href: "/admin/attendance", icon: IconClipboardCheck },
    { label: "Fees", href: "/admin/fees", icon: IconBuildingBank },
    { label: "Events", href: "/admin/events", icon: IconCalendarEvent },
    { label: "Resources", href: "/admin/resources", icon: IconFolder },
    { label: "Reports", href: "/admin/reports", icon: IconChartBar },
    { label: "School rules", href: "/admin/rules", icon: IconBook2 },
    { label: "Settings", href: "/admin/settings", icon: IconSettings },
  ],
  teacher: [
    { label: "Today", href: "/teacher", icon: IconSun },
    { label: "My classes", href: "/teacher/classes", icon: IconUsers },
    { label: "Attendance", href: "/teacher/attendance", icon: IconClipboardCheck },
    { label: "Homework", href: "/teacher/homework", icon: IconBook },
    { label: "Resources", href: "/teacher/resources", icon: IconFolder },
    { label: "Timetable", href: "/teacher/timetable", icon: IconCalendarTime },
    { label: "School rules", href: "/teacher/rules", icon: IconBook2 },
  ],
  family: [
    { label: "Overview", href: "/family", icon: IconHome },
    { label: "Register a child", href: "/family/register-child", icon: IconUserPlus },
    { label: "Calendar", href: "/family/calendar", icon: IconCalendar },
    { label: "Fees", href: "/family/fees", icon: IconBuildingBank },
    { label: "School rules", href: "/family/rules", icon: IconBook2 },
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
  teacher: "Teacher",
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
  // The newest unread, for the bell's popover.
  recent?: NotificationRow[];
  // How many things are waiting behind a nav item, by href: "Applications (6)".
  counts?: Record<string, number>;
  children: React.ReactNode;
};

export function Shell({
  area,
  schoolName,
  user,
  roles,
  unread = 0,
  recent = [],
  counts,
  children,
}: Props) {
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
            {process.env.NODE_ENV !== "production" && <DevClock />}
            {roles.length > 1 && <RoleSwitcher current={area} roles={roles} />}
            <NotificationBell area={area} unread={unread} recent={recent} />
            <SchemeToggle />
            <UserMenu name={user.name} />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        {items.map(({ label, href, icon: Icon, children: sub }) =>
          sub ? (
            <NavGroup key={href} label={label} icon={Icon} active={isActive(href)}>
              {sub.map((s) => (
                <NavLink
                  key={s.href}
                  component={Link}
                  href={s.href}
                  label={s.label}
                  active={isActive(s.href)}
                  className={classes.navLink}
                  onClick={close}
                />
              ))}
            </NavGroup>
          ) : (
            <NavLink
              key={href}
              component={Link}
              href={href}
              label={counts?.[href] ? `${label} (${counts[href]})` : label}
              active={isActive(href)}
              leftSection={<Icon size={18} stroke={1.75} />}
              className={classes.navLink}
              onClick={close}
            />
          ),
        )}
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

// A parent item that only opens its sub-items (each of those is the link). It opens
// itself whenever one of them is the current page and can be toggled by hand otherwise.
function NavGroup({
  label,
  icon: Icon,
  active,
  children,
}: {
  label: string;
  icon: Icon;
  active: boolean;
  children: React.ReactNode;
}) {
  const [opened, setOpened] = useState(active);
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setOpened(true);
  }
  return (
    <NavLink
      label={label}
      opened={opened}
      onChange={setOpened}
      leftSection={<Icon size={18} stroke={1.75} />}
      className={classes.navLink}
      childrenOffset={28}
    >
      {children}
    </NavLink>
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

// One tap flips light/dark; the header is where people look for it. The server can't
// know the resolved scheme, so both icons are rendered and CSS shows the right one —
// otherwise the first client render disagrees with the server's and React starts over.
function SchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light", { getInitialValueInEffect: true });
  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="lg"
      aria-label="Switch between light and dark mode"
      onClick={() => setColorScheme(computed === "dark" ? "light" : "dark")}
    >
      <IconSun size={20} stroke={1.75} className={classes.inDark} />
      <IconMoon size={20} stroke={1.75} className={classes.inLight} />
    </ActionIcon>
  );
}

function UserMenu({ name }: { name: string }) {
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
