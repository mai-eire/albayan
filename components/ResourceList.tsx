"use client";

import { ActionIcon, Anchor, Group, Stack, Text } from "@mantine/core";
import { IconFile, IconLink, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { confirmDestructive } from "@/components/confirm";
import { toast } from "@/components/toast";
import type { ResourceRow } from "@/lib/db/queries/resources";
import { deleteResource } from "@/lib/resources";
import classes from "./ResourceList.module.css";

// "12 KB", "3.4 MB"
export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function resourceHref(r: Pick<ResourceRow, "kind" | "storageKey" | "url">): string {
  return r.kind === "file" ? `/api/files/${r.storageKey}` : (r.url ?? "#");
}

export type ResourceListItem = ResourceRow & {
  // What to show under the title; defaults to who shared it and the size.
  context?: string;
  // Shows the remove control (the action checks again). Pages compute this, since a
  // Server Component can't pass a function down.
  removable?: boolean;
};

// Files and links as rows: icon, title (the link), context line, optional remove.
export function ResourceList({ items }: { items: ResourceListItem[] }) {
  const router = useRouter();
  const remove = (r: ResourceRow) =>
    confirmDestructive({
      title: "Remove this resource?",
      message: `"${r.title}" will no longer be available to anyone. This cannot be undone.`,
      confirmLabel: "Remove resource",
      onConfirm: async () => {
        const result = await deleteResource({ id: r.id });
        if (result.ok) {
          toast.success("Resource removed");
          router.refresh();
        } else toast.error(result.error);
      },
    });
  return (
    <Stack gap={0}>
      {items.map((r) => (
        <Group key={r.id} className={classes.row} wrap="nowrap" gap="sm">
          {r.kind === "file" ? (
            <IconFile size={20} stroke={1.5} className={classes.icon} />
          ) : (
            <IconLink size={20} stroke={1.5} className={classes.icon} />
          )}
          <div className={classes.body}>
            <Anchor
              href={resourceHref(r)}
              target={r.kind === "link" ? "_blank" : undefined}
              rel={r.kind === "link" ? "noopener" : undefined}
              fw={500}
            >
              {r.title}
            </Anchor>
            <Text size="sm" c="dimmed">
              {r.context ??
                [r.uploadedByName, formatBytes(r.sizeBytes)].filter(Boolean).join(" · ")}
            </Text>
            {r.description && <Text size="sm">{r.description}</Text>}
          </div>
          {r.removable && (
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label={`Remove ${r.title}`}
              onClick={() => remove(r)}
            >
              <IconTrash size={16} stroke={1.75} />
            </ActionIcon>
          )}
        </Group>
      ))}
    </Stack>
  );
}
