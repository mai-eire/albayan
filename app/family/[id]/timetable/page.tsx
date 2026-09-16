import { Card, Text } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { ClassTimetable } from "@/components/ClassTimetable";
import { loadChild } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function ChildTimetablePage({ params }: Props) {
  const child = await loadChild(params);
  if (!child.place) {
    return (
      <Card>
        <Text c="dimmed">{child.firstName} doesn&apos;t have a class yet.</Text>
      </Card>
    );
  }
  return (
    <Card>
      <CardTitle>
        Every {child.place.sessionName}
        {child.place.room && (
          <Text component="span" c="dimmed" fw={400}>
            {" "}
            · {child.place.room}
          </Text>
        )}
      </CardTitle>
      <ClassTimetable
        startTime={child.place.startTime}
        periods={child.place.periods.map((p) => ({ ...p, detail: p.teacherName }))}
      />
    </Card>
  );
}
