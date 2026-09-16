import { Badge, Card, Group, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import { CardTitle } from "@/components/CardTitle";
import { categoryColors, categoryLabels } from "@/lib/note-labels";
import { listNotesForGuardian } from "@/lib/db/queries/notes";
import { loadChild } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function ChildNotesPage({ params }: Props) {
  const child = await loadChild(params);
  const notes = await listNotesForGuardian(child.id);
  return (
    <Card>
      <CardTitle>Notes from {child.firstName}&apos;s teachers</CardTitle>
      {notes.length === 0 ? (
        <Text c="dimmed">Nothing yet.</Text>
      ) : (
        <Stack gap="md">
          {notes.map((n) => (
            <div key={n.id}>
              <Group gap="xs">
                <Badge variant="light" color={categoryColors[n.category]}>
                  {categoryLabels[n.category]}
                </Badge>
                <Text size="sm" c="dimmed">
                  {n.authorName} · {dayjs(n.createdAt).format("D MMM")}
                </Text>
              </Group>
              <Text mt={4} style={{ whiteSpace: "pre-wrap" }}>
                {n.body}
              </Text>
            </div>
          ))}
        </Stack>
      )}
    </Card>
  );
}
