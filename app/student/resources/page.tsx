import { Card, Stack, Text } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { ResourceList } from "@/components/ResourceList";
import { requireArea } from "@/lib/access";
import { getStudentForStudent } from "@/lib/db/queries/family";
import { listResourcesForChild } from "@/lib/db/queries/resources";

export const metadata = { title: "Resources" };

export default async function StudentResourcesPage() {
  const user = await requireArea("student");
  const me = user.student ? await getStudentForStudent(user.student.id) : null;
  const items = me ? await listResourcesForChild(me.id, me.place?.classId ?? null, "student") : [];
  return (
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader title="Resources" />
      <Card>
        {items.length === 0 ? (
          <Text c="dimmed">Nothing shared yet.</Text>
        ) : (
          <ResourceList
            items={items.map((r) => ({
              ...r,
              context: r.isSchoolWide
                ? "Whole school"
                : r.homeworkTitle
                  ? `Homework: ${r.homeworkTitle}`
                  : (r.className ?? "For you"),
            }))}
          />
        )}
      </Card>
    </Stack>
  );
}
