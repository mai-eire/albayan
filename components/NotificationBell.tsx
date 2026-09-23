"use client";

import {
  ActionIcon,
  Anchor,
  Group,
  Indicator,
  Popover,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Area } from "@/lib/current-user";
import type { NotificationRow } from "@/lib/db/queries/notifications";
import { markNotificationRead } from "@/lib/notifications";
import { MarkAllReadButton } from "./MarkAllReadButton";
import { NotificationTags } from "./NotificationList";
import classes from "./NotificationList.module.css";

// The bell shows what is waiting without leaving the page: the newest unread by title,
// then the two things anyone wants from here — clear them, or see the lot.
export function NotificationBell({
  area,
  unread,
  recent,
}: {
  area: Area;
  unread: number;
  recent: NotificationRow[];
}) {
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const all = `/${area}/notifications`;

  const open = async (n: NotificationRow) => {
    setOpened(false);
    await markNotificationRead({ id: n.id });
    router.push(n.href ?? all);
    router.refresh();
  };

  return (
    <Popover
      width={330}
      position="bottom-end"
      shadow="md"
      opened={opened}
      onChange={setOpened}
      trapFocus
    >
      <Popover.Target>
        <Indicator
          color="saffron"
          size={16}
          offset={4}
          label={unread > 9 ? "9+" : unread}
          disabled={unread === 0}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            aria-label={unread ? `${unread} unread notifications` : "Notifications"}
            onClick={() => setOpened((o) => !o)}
          >
            <IconBell size={20} stroke={1.75} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p="sm">
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            {unread ? `${unread} unread` : "Notifications"}
          </Text>
          {recent.length === 0 ? (
            <Text size="sm" c="dimmed">
              Nothing new.
            </Text>
          ) : (
            <ScrollArea.Autosize mah={280} type="auto">
              <Stack gap={0}>
                {recent.map((n) => (
                  <UnstyledButton key={n.id} className={classes.row} onClick={() => open(n)}>
                    <Group gap="xs" align="center">
                      <Text size="sm" fw={600} lineClamp={2}>
                        {n.title}
                      </Text>
                      <NotificationTags n={n} />
                    </Group>
                    <Text size="xs" c="dimmed" mt={2}>
                      {dayjs(n.createdAt).format("D MMM, HH:mm")}
                    </Text>
                  </UnstyledButton>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          )}
          <Group justify="space-between" gap="xs" wrap="nowrap">
            {unread > 0 && (
              <MarkAllReadButton size="xs" variant="subtle" onDone={() => setOpened(false)} />
            )}
            <Anchor
              component={Link}
              href={all}
              size="xs"
              fw={500}
              ms="auto"
              onClick={() => setOpened(false)}
            >
              See all notifications
            </Anchor>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
