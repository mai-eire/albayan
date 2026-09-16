"use client";

import { Button, Card, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconBellOff } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import type { NotificationRow } from "@/lib/db/queries/notifications";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";
import classes from "./NotificationList.module.css";

// The bell's list: unread rows are bold with a saffron dot; opening one marks it read and
// follows its link. The bell count is in the layout, so router.refresh() updates it.
export function NotificationList({ items }: { items: NotificationRow[] }) {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const unread = items.filter((n) => !n.readAt).length;

  const open = async (n: NotificationRow) => {
    if (!n.readAt) await markNotificationRead({ id: n.id });
    if (n.href) router.push(n.href);
    router.refresh();
  };
  const clear = async () => {
    setClearing(true);
    await markAllNotificationsRead({});
    setClearing(false);
    router.refresh();
  };

  if (items.length === 0) {
    return <EmptyState icon={<IconBellOff size={20} stroke={1.75} />} message="Nothing yet." />;
  }
  return (
    <Card>
      {unread > 0 && (
        <Group justify="flex-end" mb="sm">
          <Button variant="subtle" size="xs" loading={clearing} onClick={clear}>
            Mark all as read
          </Button>
        </Group>
      )}
      <Stack gap={0}>
        {items.map((n) => (
          <UnstyledButton
            key={n.id}
            className={classes.row}
            data-unread={!n.readAt || undefined}
            onClick={() => open(n)}
          >
            <Group wrap="nowrap" gap="sm" align="flex-start">
              <span className={classes.dot} aria-hidden />
              <div className={classes.body}>
                <Text fw={n.readAt ? 400 : 600}>{n.title}</Text>
                {n.body && (
                  <Text size="sm" c="dimmed">
                    {n.body}
                  </Text>
                )}
                <Text size="xs" c="dimmed" mt={2}>
                  {dayjs(n.createdAt).format("D MMM, HH:mm")}
                </Text>
              </div>
            </Group>
          </UnstyledButton>
        ))}
      </Stack>
    </Card>
  );
}
