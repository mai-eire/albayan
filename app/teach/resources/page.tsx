import { Card, Stack } from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ResourceList } from "@/components/ResourceList";
import { requireArea } from "@/lib/access";
import { getCurrentYear } from "@/lib/db/queries/academics";
import { listResourcesUploadedBy } from "@/lib/db/queries/resources";
import { listClassesForTeacher } from "@/lib/db/queries/teach";
import { ShareWithClassButton } from "./ShareWithClassButton";

export const metadata = { title: "Resources" };

// Everything I've shared, wherever it is attached. Sharing starts from a class.
export default async function TeacherResourcesPage() {
  const [user, year] = await Promise.all([requireArea("teach"), getCurrentYear()]);
  const [items, myClasses] = await Promise.all([
    listResourcesUploadedBy(user.id),
    user.teacher && year ? listClassesForTeacher(user.teacher.id, year.id) : [],
  ]);
  return (
    <Stack gap="lg" maw={860} mx="auto">
      <PageHeader
        title="Resources"
        eyebrow="Shared by you"
        actions={myClasses.length > 0 && <ShareWithClassButton classes={myClasses} />}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={<IconFolder size={20} stroke={1.75} />}
          message="Nothing shared yet. Files and links you share with a class show up here."
        />
      ) : (
        <Card>
          <ResourceList
            items={items.map((r) => ({
              ...r,
              removable: true,
              context: [
                r.isSchoolWide ? "Whole school" : r.className,
                r.subjectName,
                r.homeworkTitle && `homework: ${r.homeworkTitle}`,
                r.studentId && "one family",
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
          />
        </Card>
      )}
    </Stack>
  );
}
