"use client";

import { Group, Text, UnstyledButton } from "@mantine/core";
import dayjs from "dayjs";
import { SubjectBadge } from "@/components/SubjectBadge";
import type { NotificationRow as Row } from "@/lib/db/queries/notifications";
import classes from "./NotificationList.module.css";

// One notification, the same shape on the page and in the bell's popover (§4.9). The
// popover leaves out the body; everything else is identical, so the two never drift.
export function NotificationRow({
  n,
  compact,
  onOpen,
}: {
  n: Row;
  compact?: boolean;
  onOpen: (n: Row) => void;
}) {
  return (
    <UnstyledButton
      className={classes.row}
      data-unread={!n.readAt || undefined}
      data-compact={compact || undefined}
      onClick={() => onOpen(n)}
    >
      <Group gap="xs" align="center" wrap="wrap">
        <Text fw={n.readAt ? 400 : 600} size={compact ? "sm" : "md"} lineClamp={2}>
          {n.title}
        </Text>
        <NotificationTags n={n} />
      </Group>
      {!compact && n.body && (
        <Text size="sm" c="dimmed" mt={2}>
          {n.body}
        </Text>
      )}
      <Text size="xs" c="dimmed" mt={4}>
        {dayjs(n.createdAt).format("D MMM, HH:mm")}
      </Text>
    </UnstyledButton>
  );
}

// What it is about: the subject as its badge, the child by name. Both are optional — a
// school-wide notice carries neither.
export function NotificationTags({ n }: { n: Row }) {
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
