"use client";

import { Card, Stack } from "@mantine/core";
import { IconBellOff } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { NotificationRow } from "@/components/NotificationRow";
import type { NotificationRow as Row } from "@/lib/db/queries/notifications";
import { markNotificationRead } from "@/lib/notifications";

// The notifications page. Opening one marks it read and follows its link; the bell count
// is in the layout, so router.refresh() updates it. "Mark all as read" is the page action.
export function NotificationList({ items }: { items: Row[] }) {
  const router = useRouter();

  const open = async (n: Row) => {
    if (!n.readAt) await markNotificationRead({ id: n.id });
    if (n.href) router.push(n.href);
    router.refresh();
  };

  if (items.length === 0) {
    return <EmptyState icon={<IconBellOff size={20} stroke={1.75} />} message="Nothing yet." />;
  }
  return (
    <Card>
      <Stack gap="xs">
        {items.map((n) => (
          <NotificationRow key={n.id} n={n} onOpen={open} />
        ))}
      </Stack>
    </Card>
  );
}
