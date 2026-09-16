import { Card, Text } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { ShareResourceButton } from "@/components/ResourceForm";
import { ResourceList } from "@/components/ResourceList";
import { listResourcesForStudent } from "@/lib/db/queries/resources";
import { loadTeacherStudent } from "../load";

type Props = { params: Promise<{ id: string }> };

// Files shared with this one family, not the class.
export default async function TeacherStudentResourcesPage({ params }: Props) {
  const { user, student } = await loadTeacherStudent(params);
  const shared = await listResourcesForStudent(student.id);
  return (
    <Card>
      <CardTitle
        context={
          <ShareResourceButton
            target={{ kind: "student", studentId: student.id }}
            label="Share with this family"
            variant="light"
            size="xs"
          />
        }
      >
        Shared with this family
      </CardTitle>
      {shared.length === 0 ? (
        <Text size="sm" c="dimmed">
          Nothing yet. Files shared here go only to {student.firstName}&apos;s family.
        </Text>
      ) : (
        <ResourceList
          items={shared.map((r) => ({
            ...r,
            removable: user.isAdmin || r.uploadedByUserId === user.id,
          }))}
        />
      )}
    </Card>
  );
}
