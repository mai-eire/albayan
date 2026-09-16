import { Card, Text } from "@mantine/core";
import { HomeworkList } from "@/components/HomeworkList";
import { listPublishedHomeworkForClass } from "@/lib/db/queries/homework";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";
import { loadChild } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function ChildHomeworkPage({ params }: Props) {
  const [child, { timezone }] = await Promise.all([loadChild(params), getSchoolSettings()]);
  const rows = child.place ? await listPublishedHomeworkForClass(child.place.classId) : [];
  return (
    <Card>
      {rows.length === 0 ? (
        <Text c="dimmed">No homework yet.</Text>
      ) : (
        <HomeworkList rows={rows} today={todayIn(timezone)} timezone={timezone} />
      )}
    </Card>
  );
}
