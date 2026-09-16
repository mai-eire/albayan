import { Card, Text } from "@mantine/core";
import { ResourceList } from "@/components/ResourceList";
import { listResourcesForChild } from "@/lib/db/queries/resources";
import { loadChild } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function ChildResourcesPage({ params }: Props) {
  const child = await loadChild(params);
  const items = await listResourcesForChild(child.id, child.place?.classId ?? null, "guardian");
  return (
    <Card>
      {items.length === 0 ? (
        <Text c="dimmed">Nothing shared yet.</Text>
      ) : (
        <ResourceList
          items={items.map((r) => ({
            ...r,
            context: r.isSchoolWide
              ? "Whole school"
              : r.studentId
                ? `For ${child.firstName}`
                : r.homeworkTitle
                  ? `Homework: ${r.homeworkTitle}`
                  : (r.className ?? ""),
          }))}
        />
      )}
    </Card>
  );
}
