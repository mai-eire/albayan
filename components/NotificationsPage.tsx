import { Stack } from "@mantine/core";
import { MarkAllReadButton } from "@/components/MarkAllReadButton";
import { NotificationList } from "@/components/NotificationList";
import { PageHeader } from "@/components/PageHeader";
import { listNotifications } from "@/lib/db/queries/notifications";

// Shared by every area's /notifications route.
export async function NotificationsPage({ userId }: { userId: number }) {
  const items = await listNotifications(userId);
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader
        title="Notifications"
        eyebrow={unread ? `${unread} unread` : undefined}
        actions={unread > 0 && <MarkAllReadButton />}
      />
      <NotificationList items={items} />
    </Stack>
  );
}
