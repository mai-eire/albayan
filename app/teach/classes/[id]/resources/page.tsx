import { Card, Group, Stack, Text } from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { ShareResourceButton } from "@/components/ResourceForm";
import { ResourceList } from "@/components/ResourceList";
import { listResourcesForClass } from "@/lib/db/queries/resources";
import { loadTeacherClass } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function ClassResourcesPage({ params }: Props) {
  const { user, cls } = await loadTeacherClass(params);
  const items = await listResourcesForClass(cls.id);
  return (
    <Stack gap="md">
      <Group>
        <ShareResourceButton
          target={{ kind: "class", classId: cls.id, subjectId: null }}
          label="Share with this class"
        />
      </Group>
      {items.length === 0 ? (
        <EmptyState
          icon={<IconFolder size={20} stroke={1.75} />}
          message="Nothing shared with this class yet."
        />
      ) : (
        <Card>
          <ResourceList
            items={items.map((r) => ({
              ...r,
              removable: user.isAdmin || r.uploadedByUserId === user.id,
              context: [
                r.uploadedByName,
                r.subjectName,
                r.homeworkTitle && `homework: ${r.homeworkTitle}`,
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
          />
          <Text size="sm" c="dimmed" mt="md">
            Files attached to homework appear here too.
          </Text>
        </Card>
      )}
    </Stack>
  );
}
