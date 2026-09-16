import { Card, Stack, Text } from "@mantine/core";
import { HomeworkList } from "@/components/HomeworkList";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";
import { getStudentForStudent } from "@/lib/db/queries/family";
import { listPublishedHomeworkForClass } from "@/lib/db/queries/homework";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";

export const metadata = { title: "Homework" };

export default async function StudentHomeworkPage() {
  const [user, { timezone }] = await Promise.all([requireArea("student"), getSchoolSettings()]);
  const me = user.student ? await getStudentForStudent(user.student.id) : null;
  const rows = me?.place ? await listPublishedHomeworkForClass(me.place.classId) : [];
  return (
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader title="Homework" />
      <Card>
        {rows.length === 0 ? (
          <Text c="dimmed">No homework. Enjoy the weekend.</Text>
        ) : (
          <HomeworkList rows={rows} today={todayIn(timezone)} timezone={timezone} />
        )}
      </Card>
    </Stack>
  );
}
