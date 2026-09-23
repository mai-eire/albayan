"use client";

import { Card, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconBellOff } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { SubjectBadge } from "@/components/SubjectBadge";
import type { NotificationRow } from "@/lib/db/queries/notifications";
import { markNotificationRead } from "@/lib/notifications";
import classes from "./NotificationList.module.css";

// The notifications page: unread rows are bold with a saffron dot; opening one marks it
// read and follows its link. The bell count is in the layout, so router.refresh() updates
// it. "Mark all as read" is the page action, not a button in here.
export function NotificationList({ items }: { items: NotificationRow[] }) {
  const router = useRouter();

  const open = async (n: NotificationRow) => {
    if (!n.readAt) await markNotificationRead({ id: n.id });
    if (n.href) router.push(n.href);
    router.refresh();
  };

  if (items.length === 0) {
    return <EmptyState icon={<IconBellOff size={20} stroke={1.75} />} message="Nothing yet." />;
  }
  return (
    <Card>
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
                <Group gap="xs" align="center">
                  <Text fw={n.readAt ? 400 : 600}>{n.title}</Text>
                  <NotificationTags n={n} />
                </Group>
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

// What it is about: the subject as its badge, the child by name. Both are optional — a
// school-wide notice carries neither.
export function NotificationTags({ n }: { n: NotificationRow }) {
  if (!n.subjectId && !n.studentName) return null;
  return (
    <>
      {n.subjectId && n.subjectName && (
        <SubjectBadge subjectId={n.subjectId} name={n.subjectName} size="xs" />
      )}
      {n.studentName && (
        <Text size="xs" c="dimmed">
          {n.studentName}
        </Text>
      )}
    </>
  );
}
