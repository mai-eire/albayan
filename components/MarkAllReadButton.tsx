"use client";

import { Button } from "@mantine/core";
import { IconChecks } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { markAllNotificationsRead } from "@/lib/notifications";

// The page action on /{area}/notifications and the same action inside the bell's popover.
export function MarkAllReadButton({
  size = "sm",
  variant = "default",
  onDone,
}: {
  size?: "xs" | "sm";
  variant?: "default" | "subtle";
  onDone?: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      loading={saving}
      leftSection={<IconChecks size={16} stroke={1.75} />}
      onClick={async () => {
        setSaving(true);
        await markAllNotificationsRead({});
        setSaving(false);
        onDone?.();
        router.refresh();
      }}
    >
      Mark all as read
    </Button>
  );
}
